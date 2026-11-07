import { DIAS_INICIAIS, ESTACOES_INMET, JANELA_PRECISAO_DIAS, PONTOS_VERIFICACAO, VARIAVEIS, type VariavelId } from "@/config/fontes";
import { hojeEmSaoPaulo } from "@/lib/indice/previsao";
import { gravarNiveis, gravarObservadas, gravarPrecisao, gravarPrevistas, limparAntigos, paresDaJanela, previsoesPassadas } from "./banco";
import { lerJsonInmet, tokenInmet } from "./estacoes";
import { anotarStatus, apagarBrutasAntigas, buscarTexto, guardarBruto } from "./guardar";
import { buscarModelos } from "./modelos";
import { baixarOns } from "./ons";
import { agregarFaixas, calcularPrecisao, linhasDeRodadasAnteriores, linhasDePrevisao, urlRodadasAnteriores } from "./precisao";

const menos = (hoje: string, dias: number) => new Date(Date.parse(hoje) - dias * 86_400_000).toISOString().slice(0, 10);
const erroCurto = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 200);

type Estacao = (typeof ESTACOES_INMET)[number];

/** Série horária → faixas de 6 h, para cada variável. */
function porFaixa(tempo: string[], series: Partial<Record<VariavelId, (number | null)[]>>) {
  return Object.fromEntries(Object.entries(series).map(([v, xs]) => [v, agregarFaixas(tempo, xs!, v as VariavelId)])) as Partial<Record<VariavelId, ReturnType<typeof agregarFaixas>>>;
}

/** O que o Open-Meteo estima que aconteceu (Historical Forecast API). Serve quando não há estação: fica marcado como "estimado". */
async function estimadoDoPassado(e: Estacao, de: string, ate: string) {
  const vars = VARIAVEIS.map((v) => v.api).join(",");
  const r = await buscarTexto(
    `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${e.lat}&longitude=${e.lon}&elevation=${e.alt}&hourly=${vars}&start_date=${de}&end_date=${ate}&timezone=America%2FSao_Paulo&wind_speed_unit=ms`,
    { tempoMs: 30_000 },
  );
  if (!r.ok) throw new Error(`Historical Forecast respondeu ${r.status}`);
  await guardarBruto(`openmeteo:historico:${e.id}`, r);
  const h = JSON.parse(r.texto).hourly;
  return porFaixa(h.time, Object.fromEntries(VARIAVEIS.map((v) => [v.id, h[v.api]])));
}

/** Medições do INMET em blocos de 10 dias (a API não gosta de períodos longos). Nuvens não são medidas. */
async function medidoNoInmet(e: Estacao, de: string, ate: string) {
  const leituras = [];
  for (let ini = de; ini <= ate; ini = menos(ini, -10)) {
    const fim = menos(ini, -9) < ate ? menos(ini, -9) : ate;
    const r = await buscarTexto(`https://apitempo.inmet.gov.br/token/estacao/${ini}/${fim}/${e.id}/${tokenInmet()}`, { tempoMs: 30_000 });
    if (!r.ok) throw new Error(`INMET respondeu ${r.status}`);
    await guardarBruto(`inmet:${e.id}:rotina:${ini}`, r);
    leituras.push(...lerJsonInmet(r.texto, e.alt));
  }
  leituras.sort((a, b) => a.tempo.localeCompare(b.tempo));
  const tempo = leituras.map((l) => l.tempo);
  return porFaixa(tempo, {
    temp: leituras.map((l) => l.temp),
    pressao: leituras.map((l) => l.pressao),
    vento: leituras.map((l) => l.vento),
    chuva: leituras.map((l) => l.chuva),
  });
}

export interface Relatorio {
  hoje: string;
  etapas: Record<string, string>;
}

/**
 * A rotina do dia, chamada pelo cron da Vercel. Repetir no mesmo dia não duplica nada.
 * 1. Nível das represas no ONS. 2. Em cada ponto de conferência: grava o que os modelos preveem para 7 dias,
 * completa o passado com a Previous Runs API (60 dias na primeira vez) e grava o que aconteceu.
 * 3. Calcula erro, pesos e viés dos últimos 30 dias. 4. Apaga o que passou do prazo.
 */
export async function rodarRotina(agora = new Date()): Promise<Relatorio> {
  const hoje = hojeEmSaoPaulo(agora);
  const etapas: Record<string, string> = {};
  const ons = { fonte: "ons", nome: "ONS · represas de usina", grupo: "ONS" };

  try {
    const { niveis, respostas } = await baixarOns(hoje);
    const recentes = niveis.filter((n) => n.data >= menos(hoje, 40));
    await gravarNiveis(recentes, "ons");
    for (const r of respostas) await guardarBruto("ons", r);
    const ultima = recentes.map((n) => n.data).sort().at(-1);
    await anotarStatus(ons, { ok: true, dadoDe: ultima ? new Date(`${ultima}T12:00:00-03:00`) : null });
    etapas.ons = `${recentes.length} dias de represa`;
  } catch (err) {
    await anotarStatus(ons, { ok: false, erro: erroCurto(err) });
    etapas.ons = `falhou: ${erroCurto(err)}`;
  }

  // Os três pontos ao mesmo tempo: o histórico de 60 dias leva cerca de 30 s em cada um.
  await Promise.all(PONTOS_VERIFICACAO.map(async (id) => {
    const e = ESTACOES_INMET.find((x) => x.id === id)!;
    const conferencia = { fonte: `openmeteo:conferencia:${id}`, nome: `Open-Meteo · conferência em ${e.nome}`, grupo: "Open-Meteo" };
    try {
      const { dados, resposta } = await buscarModelos(e.lat, e.lon, { elevacao: e.alt, diasPassados: 0, dias: 8, semCache: true });
      await guardarBruto(`openmeteo:modelos:${id}`, resposta);
      const novas = await gravarPrevistas(linhasDePrevisao(id, dados, hoje), hoje);

      const primeiraVez = (await previsoesPassadas(id, hoje)) === 0;
      const dias = primeiraVez ? DIAS_INICIAIS : 8;
      const ant = await buscarTexto(urlRodadasAnteriores(e.lat, e.lon, e.alt, dias), { tempoMs: 120_000 });
      if (!ant.ok) throw new Error(`Previous Runs respondeu ${ant.status}`);
      await guardarBruto(`openmeteo:rodadas:${id}`, ant);
      const passadas = await gravarPrevistas(linhasDeRodadasAnteriores(id, ant.texto, hoje), hoje);
      await anotarStatus(conferencia, { ok: true, dadoDe: resposta.obtidoEm });

      // O que aconteceu: estimativa primeiro (nunca sobrescreve), depois a estação, que passa por cima.
      const de = menos(hoje, dias);
      const ate = menos(hoje, 1);
      const est = await estimadoDoPassado(e, de, ate);
      for (const [v, xs] of Object.entries(est)) await gravarObservadas(id, v as VariavelId, xs!, "estimado");
      let medido = "sem token do INMET";
      if (tokenInmet()) {
        const inmet = { fonte: `inmet:conferencia:${id}`, nome: `INMET · ${e.nome} (conferência)`, grupo: "INMET" };
        try {
          const obs = await medidoNoInmet(e, de, ate);
          for (const [v, xs] of Object.entries(obs)) await gravarObservadas(id, v as VariavelId, xs!, "inmet");
          await anotarStatus(inmet, { ok: true });
          medido = "INMET ok";
        } catch (err) {
          await anotarStatus(inmet, { ok: false, erro: erroCurto(err) });
          medido = `INMET falhou: ${erroCurto(err)}`;
        }
      }
      etapas[id] = `${novas} previsões novas, ${passadas} de rodadas anteriores${primeiraVez ? " (60 dias iniciais)" : ""}; ${medido}`;
    } catch (err) {
      await anotarStatus(conferencia, { ok: false, erro: erroCurto(err) });
      etapas[id] = `falhou: ${erroCurto(err)}`;
    }
  }));

  try {
    const resumo = calcularPrecisao(await paresDaJanela(hoje, JANELA_PRECISAO_DIAS), hoje, agora);
    await gravarPrecisao(hoje, resumo);
    etapas.precisao = `${resumo.erros.length} erros calculados; pesos em ${Object.keys(resumo.pesos).length} variáveis`;
  } catch (err) {
    etapas.precisao = `falhou: ${erroCurto(err)}`;
  }

  try {
    const apagados = await limparAntigos(hoje);
    const brutas = await apagarBrutasAntigas(agora);
    etapas.limpeza = JSON.stringify({ ...apagados, brutas });
  } catch (err) {
    etapas.limpeza = `falhou: ${erroCurto(err)}`;
  }
  return { hoje, etapas };
}
