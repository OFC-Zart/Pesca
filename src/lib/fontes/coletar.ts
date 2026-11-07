import {
  ALCANCE_KM,
  ESTACOES_ANA,
  ESTACOES_INMET,
  PONTOS_VERIFICACAO,
  REPRESAS,
  distanciaKm,
  maisPerto,
  represaMaisPerto,
} from "@/config/fontes";
import { notaRepresa, notaRio } from "@/lib/indice/calculo";
import type { Discordancia, InfoFontes, Local, NivelAgua, Origem, SerieClima } from "@/lib/indice/tipos";
import { buscarClima, buscarEnsembleBruto, montarCenarios, type ClimaBase } from "@/lib/openmeteo";
import { chuvaPorHora, obterAna, variacaoNivel, type LeituraAna } from "./ana";
import { niveisDaRepresa, ultimaPrecisao } from "./banco";
import { FONTES_ESTACAO, type LeituraEstacao } from "./estacoes";
import { anotarStatus, depois, type Obtido } from "./guardar";
import { buscarModelos, combinar, discordanciaPorDia, modelosPresentes, resumoDeHoje, seriesPorModelo, substituirFuturo, type PrevisaoModelos } from "./modelos";
import { aplicarObservado, combinarChuva, doEstacao, observadoVazio } from "./observado";
import { variacao7Dias } from "./ons";

export function estacaoDoRio(local: Pick<Local, "lat" | "lon" | "estacao">) {
  const escolhida = ESTACOES_ANA.find((e) => e.id === local.estacao);
  if (escolhida) return { ...escolhida, km: distanciaKm(local.lat, local.lon, escolhida.lat, escolhida.lon) };
  return maisPerto(local.lat, local.lon, ESTACOES_ANA.filter((e) => e.nivel), ALCANCE_KM.rio);
}

export function represaDoLocal(local: Pick<Local, "lat" | "lon" | "represa">) {
  return REPRESAS.find((r) => r.id === local.represa) ?? REPRESAS.find((r) => r.id === represaMaisPerto(local.lat, local.lon).id)!;
}

/** Hora cheia atual em Brasília, no formato da série ("YYYY-MM-DDTHH:00"). Antes dela é passado. */
export function horaCheiaLocal(agora: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(agora)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`;
}

const km = (n: number) => `${Math.round(n)} km`;
/** "pelo INMET", "pela Epagri/Ciram". */
const artigoDe = (fonte: string) => (fonte.startsWith("Epagri") ? `pela ${fonte}` : `pelo ${fonte}`);
const horaDe = (t: string) => t.slice(11, 16);
const dataDe = (t: string) => `${t.slice(8, 10)}/${t.slice(5, 7)}`;

export interface Coleta {
  base: ClimaBase;
  serie: SerieClima;
  cenarios: SerieClima[] | null;
  porModelo: SerieClima[] | null;
  discordancia: Map<string, Discordancia>;
  /** Nota do nível do rio (hoje e amanhã) e da represa (todos os dias). Null: sem medida. */
  rio: number | null;
  represa: number | null;
  fontes: InfoFontes;
}

function anotar(fonte: string, nome: string, r: PromiseSettledResult<unknown>, dadoDe?: Date) {
  depois(() =>
    anotarStatus(
      { fonte, nome, grupo: "Open-Meteo" },
      r.status === "fulfilled" ? { ok: true, dadoDe } : { ok: false, erro: r.reason instanceof Error ? r.reason.message : String(r.reason) },
    ),
  );
}

/**
 * Junta as fontes de um local: clima principal, ensemble, seis modelos, estação do INMET (ou Epagri), ANA e ONS.
 * O passado vem do que foi medido; o futuro, da média ponderada dos modelos. Qualquer fonte nova que falhe é só deixada de lado.
 */
export async function coletar(local: Local, hoje: string, agora: Date): Promise<Coleta> {
  const agoraLocal = horaCheiaLocal(agora);
  const avisos: string[] = [];

  const estacao = maisPerto(local.lat, local.lon, ESTACOES_INMET, ALCANCE_KM.inmet);
  const fonteEstacao = FONTES_ESTACAO.find((f) => f.configurada()) ?? null;
  const rioEst = local.tipo === "rio" ? estacaoDoRio(local) : null;
  const chuvaEst =
    rioEst?.chuva && rioEst.km <= ALCANCE_KM.chuva ? rioEst : maisPerto(local.lat, local.lon, ESTACOES_ANA.filter((e) => e.chuva), ALCANCE_KM.chuva);
  const represa = local.tipo === "represa" ? represaDoLocal(local) : null;

  const pAnaChuva = chuvaEst ? obterAna(chuvaEst.id, chuvaEst.nome, 3) : Promise.resolve(null);
  const pAnaRio = rioEst ? (rioEst.id === chuvaEst?.id ? pAnaChuva : obterAna(rioEst.id, rioEst.nome, 3)) : Promise.resolve(null);

  const [base, ens, mod, prec, est, anaChuva, anaRio, niveis] = await Promise.allSettled([
    buscarClima(local.lat, local.lon),
    buscarEnsembleBruto(local.lat, local.lon),
    buscarModelos(local.lat, local.lon),
    ultimaPrecisao(),
    estacao && fonteEstacao ? fonteEstacao.obter(estacao, 8) : Promise.resolve(null),
    pAnaChuva,
    pAnaRio,
    represa ? niveisDaRepresa(represa.id, hoje) : Promise.resolve([]),
  ]);

  anotar("openmeteo:principal", "Open-Meteo · clima principal", base);
  anotar("openmeteo:ensemble", "Open-Meteo · ensemble GFS (31 cenários)", ens);
  anotar("openmeteo:modelos", "Open-Meteo · ECMWF, GFS, ICON, GEM e JMA", mod, mod.status === "fulfilled" ? mod.value.resposta.obtidoEm : undefined);
  if (base.status === "rejected") throw base.reason;
  const clima = base.value;

  // 1. O passado medido.
  const obs = observadoVazio();
  const estObtido = est.status === "fulfilled" ? (est.value as Obtido<LeituraEstacao[]> | null) : null;
  const usaEstacao = Boolean(estacao && estObtido?.dados?.length);
  if (estacao && estObtido?.dados) Object.assign(obs, doEstacao(estObtido.dados, estacao.alt, clima.elevacao));
  if (estacao && fonteEstacao && !usaEstacao) avisos.push(`${fonteEstacao.nome} (${estacao.nome}) sem resposta: ar e pressão estimados.`);
  else if (estObtido?.estado === "atrasada") avisos.push(`${fonteEstacao!.nome} (${estacao!.nome}) atrasado: última leitura antiga.`);

  const chuvas: { mapa: Map<string, number>; km: number; nome: string }[] = [];
  if (usaEstacao && estacao!.km <= ALCANCE_KM.chuva) {
    const m = new Map<string, number>();
    for (const l of estObtido!.dados!) if (l.chuva !== null) m.set(l.tempo, l.chuva);
    chuvas.push({ mapa: m, km: estacao!.km, nome: `${artigoDe(fonteEstacao!.nome)} em ${estacao!.nome} (${km(estacao!.km)} daqui)` });
  }
  const anaChuvaObt = anaChuva.status === "fulfilled" ? (anaChuva.value as Obtido<LeituraAna[]> | null) : null;
  if (chuvaEst && anaChuvaObt?.dados) chuvas.push({ mapa: chuvaPorHora(anaChuvaObt.dados), km: chuvaEst.km, nome: `pela ANA em ${chuvaEst.nome} (${km(chuvaEst.km)} daqui)` });
  else if (chuvaEst) avisos.push(`ANA (${chuvaEst.nome}) sem resposta: chuva estimada.`);
  if (chuvaEst && anaChuvaObt?.estado === "atrasada") avisos.push(`ANA (${chuvaEst.nome}) atrasada: chuva medida pode estar velha.`);
  obs.chuva = combinarChuva(chuvas);

  const medido = aplicarObservado(clima.serie, obs, agoraLocal);
  let serie = medido.serie;

  // 2. O futuro pela média dos modelos.
  const resumo = prec.status === "fulfilled" ? prec.value : null;
  const pontoPerto = maisPerto(local.lat, local.lon, ESTACOES_INMET.filter((e) => (PONTOS_VERIFICACAO as readonly string[]).includes(e.id)), ALCANCE_KM.inmet);
  const vies = pontoPerto ? (resumo?.vies?.[pontoPerto.id] ?? null) : null;
  const pesos = resumo?.pesos && Object.keys(resumo.pesos).length ? resumo.pesos : null;
  let modelos: PrevisaoModelos | null = null;
  let porModelo: SerieClima[] | null = null;
  let discordancia = new Map<string, Discordancia>();
  if (mod.status === "fulfilled") {
    modelos = mod.value.dados;
    porModelo = seriesPorModelo(serie, modelos, agoraLocal);
    serie = substituirFuturo(serie, modelos.tempo, combinar(modelos, hoje, pesos, vies), agoraLocal);
    discordancia = discordanciaPorDia(modelos);
  } else {
    avisos.push("Os modelos extras não responderam: usando só o clima principal.");
  }

  // 3. Os cenários do ensemble usam a série já corrigida no passado.
  const cenarios = ens.status === "fulfilled" ? montarCenarios(ens.value, serie) : null;
  if (!cenarios) avisos.push("Ensemble fora do ar: confiança estimada pela distância do dia.");

  // 4. Nível do rio (ANA) e da represa (ONS, ou ANA na barragem).
  let rio: NivelAgua | null = null;
  const anaRioObt = anaRio.status === "fulfilled" ? (anaRio.value as Obtido<LeituraAna[]> | null) : null;
  if (rioEst && anaRioObt?.dados) {
    const v = variacaoNivel(anaRioObt.dados, 24);
    if (v) rio = { ...v, fonte: `ANA · ${rioEst.nome} (${rioEst.rio}, a ${km(rioEst.km)})` };
  }
  if (local.tipo === "rio" && !rio) avisos.push(rioEst ? `Nível do rio indisponível (ANA ${rioEst.nome}).` : "Nenhuma estação de nível da ANA a menos de 40 km.");

  let nivelRepresa: NivelAgua | null = null;
  if (represa) {
    const doOns = niveis.status === "fulfilled" ? niveis.value : [];
    const recente = doOns.length && doOns[doOns.length - 1].data >= new Date(Date.parse(hoje) - 3 * 86_400_000).toISOString().slice(0, 10);
    const v = recente ? variacao7Dias(doOns) : null;
    if (v) {
      nivelRepresa = { atual: v.atual, variacao: v.variacao, volume: v.volume, medidoEm: `${v.data}T12:00`, fonte: `ONS · ${represa.nome}` };
    } else {
      const ana = await obterAna(represa.ana, `${represa.nome} (barragem)`, 8);
      if (ana.dados) {
        const porDia = new Map<string, number[]>();
        for (const l of ana.dados) {
          if (l.nivel === null) continue;
          const d = l.tempo.slice(0, 10);
          if (!porDia.has(d)) porDia.set(d, []);
          // A barragem mede em cm acima do mar; o ONS, em metros.
          porDia.get(d)!.push(l.nivel / 100);
        }
        const diarios = [...porDia].map(([data, xs]) => ({ data, nivel: xs.reduce((a, b) => a + b, 0) / xs.length }));
        const w = variacao7Dias(diarios);
        if (w) nivelRepresa = { atual: w.atual, variacao: w.variacao, volume: null, medidoEm: `${w.data}T12:00`, fonte: `ANA · barragem da ${represa.nome}` };
      }
      if (!nivelRepresa) avisos.push(`Nível da ${represa.nome} indisponível no ONS e na ANA.`);
    }
  }

  // 5. De onde veio cada número, em frases curtas.
  const nModelos = modelos ? modelosPresentes(modelos).length : 0;
  // A tela já põe "Medido", "Estimado" ou "Previsto" na frente: a frase só diz por quem.
  const futuro = nModelos ? `média de ${nModelos} modelos${pesos ? ", com peso pela precisão de cada um" : ", com pesos iguais"}` : "Open-Meteo";
  const futuroCap = futuro.charAt(0).toUpperCase() + futuro.slice(1) + ".";
  const fonteAr = usaEstacao ? `${artigoDe(fonteEstacao!.nome)} em ${estacao!.nome} (${km(estacao!.km)} daqui, corrigido pela altitude)` : null;
  const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const origem = (medidoPor: string | null, horas: number): Origem =>
    medidoPor && horas
      ? { tipo: "misto", hoje: `${maiuscula(medidoPor)} até agora; daqui para a frente, ${futuro}.`, depois: futuroCap }
      : { tipo: "estimado", hoje: `Pelo Open-Meteo até agora; daqui para a frente, ${futuro}.`, depois: futuroCap };

  const origens: InfoFontes["origens"] = {
    temp: origem(fonteAr, medido.horas.temp),
    pressao: origem(fonteAr, medido.horas.pressao),
    vento: origem(fonteAr, medido.horas.vento),
    chuva: origem(chuvas.length ? chuvas.map((c) => c.nome).join(" e ") : null, medido.horas.chuva),
    nuvens: { tipo: "previsto", hoje: futuroCap, depois: futuroCap },
  };
  if (rio) origens.rio = { tipo: "observado", hoje: `${rio.fonte}, às ${horaDe(rio.medidoEm)} de ${dataDe(rio.medidoEm)}.`, depois: "Sem previsão de nível: ele só conta hoje e amanhã." };
  if (nivelRepresa) {
    const t = `${nivelRepresa.fonte}, dia ${dataDe(nivelRepresa.medidoEm)}.`;
    origens.represa = { tipo: "observado", hoje: t, depois: `${t} A represa muda devagar, então o mesmo valor vale para os próximos dias.` };
  }

  return {
    base: clima,
    serie,
    cenarios,
    porModelo,
    discordancia,
    rio: rio ? notaRio(rio.variacao) : null,
    represa: nivelRepresa ? notaRepresa(nivelRepresa.variacao) : null,
    fontes: {
      modelos: nModelos,
      pesos: pesos ? "precisao" : "iguais",
      correcaoVies: Boolean(vies && Object.keys(vies).length),
      origens,
      rio,
      represa: nivelRepresa,
      avisos,
      hoje: modelos ? resumoDeHoje(modelos, hoje, pesos) : [],
    },
  };
}

