import {
  CONFIANCA_FAIXA,
  CONFIANCA_RESERVA,
  CONFIANCA_TABELA,
  ESPECIES,
  ESPECIE_IDS,
  DIAS_COM_NIVEL_DO_RIO,
  FASES,
  PESOS_POR_TIPO,
  RIO,
  SEGURANCA,
  VERSAO_MODELO,
  type EspecieId,
} from "@/config/indice";
import { coletar } from "@/lib/fontes/coletar";
import { prepararHoras } from "./agua";
import { calcularAstro } from "./astro";
import { agruparDias, avaliarDia, brutosDoDia, confiancaTabela, fraseMotivo, percentil, type Contexto } from "./calculo";
import type { Astro, DiaClima, DiaPrevisao, Discordancia, Fase, HoraClima, InfoFontes, Local, NivelConfianca, NotaEspecie, Previsao, SerieClima } from "./tipos";

import { FONTES_VAZIAS } from "./previsao-vazia";

export function hojeEmSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

function faseDoDia(i: number): Fase {
  if (i <= FASES.completaAte) return "completa";
  if (i <= FASES.faixaAte) return "faixa";
  return "tendencia";
}

function nivelPorFaixa(largura: number): NivelConfianca {
  if (largura <= CONFIANCA_FAIXA.alta) return "alta";
  if (largura <= CONFIANCA_FAIXA.media) return "media";
  return "baixa";
}

function nivelPorTabela(pct: number): NivelConfianca {
  if (pct >= CONFIANCA_RESERVA.alta) return "alta";
  if (pct >= CONFIANCA_RESERVA.media) return "media";
  return "baixa";
}

/** Avisos de segurança do dia. Mais de um aparece junto: tempestade não pode esconder a cheia. */
function textoBloqueio(d: DiaClima, ctx: Contexto): string | null {
  const avisos = [
    d.tempestade ? "Tempestade prevista" : null,
    d.ventoMax > SEGURANCA.ventoMax ? `Vento de até ${Math.round(d.ventoMax)} m/s` : null,
    ctx.rio <= RIO.cheia.nota ? "Rio em cheia – cuidado" : null,
  ].filter(Boolean);
  return avisos.length ? avisos.join(" · ") : null;
}

function horasPorDia(horas: HoraClima[]): Map<string, HoraClima[]> {
  const mapa = new Map<string, HoraClima[]>();
  for (const h of horas) {
    if (!mapa.has(h.data)) mapa.set(h.data, []);
    mapa.get(h.data)!.push(h);
  }
  return mapa;
}

/** Nota de cada espécie em cada cenário (do ensemble ou de um modelo), indexada por data. */
function notasDosCenarios(cenarios: SerieClima[], local: Local, astroPorData: Map<string, Astro>, ctxDoDia: (data: string) => Contexto) {
  const porData = new Map<string, Record<EspecieId, number[]>>();
  for (const serie of cenarios) {
    for (const [data, horas] of horasPorDia(prepararHoras(serie, local))) {
      const astro = astroPorData.get(data);
      if (!astro) continue;
      if (!porData.has(data)) {
        porData.set(data, Object.fromEntries(ESPECIE_IDS.map((id) => [id, [] as number[]])) as unknown as Record<EspecieId, number[]>);
      }
      const ctx = ctxDoDia(data);
      for (const id of ESPECIE_IDS) porData.get(data)![id].push(avaliarDia(horas, ESPECIES[id], astro, ctx).nota);
    }
  }
  return porData;
}

/** Monta a previsão a partir da série já obtida. Função pura, para poder ser testada sem rede. */
export function montarPrevisao(args: {
  local: Local;
  locais: Local[];
  serie: SerieClima;
  offsetSeg: number;
  cenarios: SerieClima[] | null;
  hoje: string;
  agora: Date;
  /** Uma série por modelo de previsão: o quanto a nota muda entre eles baixa a confiança. */
  porModelo?: SerieClima[] | null;
  /** Nota do nível medido: rio vale para hoje e amanhã; represa, para todos os dias. Null: sem medida. */
  rio?: number | null;
  represa?: number | null;
  discordancia?: Map<string, Discordancia>;
  fontes?: InfoFontes;
}): Previsao {
  const { local, locais, serie, offsetSeg, cenarios, hoje, agora } = args;
  const pesos = PESOS_POR_TIPO[local.tipo] ?? PESOS_POR_TIPO.acude;
  const datas = agruparDias(serie).map((d) => d.data);
  const ctxDoDia = (data: string): Contexto => {
    const k = datas.indexOf(data) - datas.indexOf(hoje);
    return { pesos, rio: args.rio != null && k >= 0 && k < DIAS_COM_NIVEL_DO_RIO ? args.rio : 1, represa: args.represa ?? 1 };
  };
  const dias = agruparDias(serie);
  const inicio = dias.findIndex((d) => d.data === hoje);
  if (inicio === -1) throw new Error(`Sem dados de clima para ${hoje}`);

  const porDia = horasPorDia(prepararHoras(serie, local));
  const aguaPorDia = new Map(
    [...porDia].map(([data, horas]) => [data, horas.reduce((s, h) => s + h.tempAgua, 0) / horas.length]),
  );

  const astroPorData = new Map<string, Astro>();
  for (let i = inicio; i < dias.length; i++) {
    astroPorData.set(dias[i].data, calcularAstro(dias[i].data, local.lat, local.lon, offsetSeg));
  }
  const cen = cenarios?.length ? notasDosCenarios(cenarios, local, astroPorData, ctxDoDia) : null;
  const mod = args.porModelo?.length ? notasDosCenarios(args.porModelo, local, astroPorData, ctxDoDia) : null;

  const saida: DiaPrevisao[] = [];
  for (let i = inicio; i < dias.length; i++) {
    const d = dias[i];
    const k = i - inicio;
    const astro = astroPorData.get(d.data)!;
    const brutos = brutosDoDia(dias, i, aguaPorDia);
    const fase = faseDoDia(k);
    const pct = confiancaTabela(k, CONFIANCA_TABELA);
    const notasCen = cen?.get(d.data);
    const notasMod = mod?.get(d.data);
    const horasDoDia = porDia.get(d.data) ?? [];
    const ctx = ctxDoDia(d.data);
    let maiorLargura = 0;

    const especies = {} as Record<EspecieId, NotaEspecie>;
    for (const id of ESPECIE_IDS) {
      const av = avaliarDia(horasDoDia, ESPECIES[id], astro, ctx);
      const { hora, tempAgua, deltaAgua48h, deltaPressao24h, vento, chuva48h, nuvens } = av.melhor;
      const base = { hora, tempAgua, deltaAgua48h, deltaPressao24h, vento, chuva48h, nuvens };
      if (fase === "tendencia") {
        especies[id] = { nota: null, min: null, max: null, fatores: av.fatores, horario: av.horario, base, horas: null, motivo: "" };
        continue;
      }
      // A faixa junta os cenários do ensemble e os modelos; a confiança cai com a maior das duas incertezas.
      const deModelos = notasMod?.[id] ?? [];
      const lista = [...(notasCen?.[id] ?? []), ...deModelos].sort((a, b) => a - b);
      const larguraModelos = deModelos.length >= 2 ? Math.max(...deModelos) - Math.min(...deModelos) : 0;
      let nota = av.nota;
      let min: number;
      let max: number;
      if (lista.length) {
        const p10 = Math.round(percentil(lista, 0.1));
        const p90 = Math.round(percentil(lista, 0.9));
        // Sem os modelos, a mediana do ensemble é mais firme que uma previsão só. Com eles, a média ponderada já é a aposta.
        if (fase === "faixa" && !deModelos.length) nota = Math.round(percentil(lista, 0.5));
        min = Math.min(p10, nota);
        max = Math.max(p90, nota);
        maiorLargura = Math.max(maiorLargura, larguraModelos);
      } else {
        const margem = Math.round((100 - pct) * CONFIANCA_RESERVA.pontosPorPct);
        min = Math.max(0, av.nota - margem);
        max = Math.min(100, av.nota + margem);
      }
      maiorLargura = Math.max(maiorLargura, max - min);
      especies[id] = {
        nota,
        min,
        max,
        fatores: av.fatores,
        horario: av.horario,
        base,
        horas: fase === "completa" ? av.horas : null,
        motivo: fraseMotivo(id, nota, av.fatores, av.melhor, pesos),
      };
    }

    saida.push({
      data: d.data,
      fase,
      astro,
      brutos,
      confianca: fase === "tendencia" ? "baixa" : notasCen || notasMod ? nivelPorFaixa(maiorLargura) : nivelPorTabela(pct),
      bloqueio: fase === "tendencia" ? null : textoBloqueio(d, ctx),
      horasInseguras: d.horasInseguras,
      discordancia: args.discordancia?.get(d.data) ?? null,
      especies,
    });
  }

  return {
    local,
    locais,
    atualizadoEm: agora.toISOString(),
    fonteConfianca: cen ? "ensemble" : "tabela",
    versaoModelo: VERSAO_MODELO,
    dias: saida,
    fontes: args.fontes ?? FONTES_VAZIAS,
  };
}

export async function gerarPrevisao(local: Local, locais: Local[], agora = new Date()): Promise<Previsao> {
  const hoje = hojeEmSaoPaulo(agora);
  const c = await coletar(local, hoje, agora);
  return montarPrevisao({
    local,
    locais,
    serie: c.serie,
    offsetSeg: c.base.offsetSeg,
    cenarios: c.cenarios,
    hoje,
    agora,
    porModelo: c.porModelo,
    rio: c.rio,
    represa: c.represa,
    discordancia: c.discordancia,
    fontes: c.fontes,
  });
}
