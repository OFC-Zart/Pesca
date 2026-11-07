import {
  CONFIANCA_FAIXA,
  CONFIANCA_RESERVA,
  CONFIANCA_TABELA,
  ESPECIES,
  ESPECIE_IDS,
  FASES,
  SEGURANCA,
  VERSAO_MODELO,
  type EspecieId,
} from "@/config/indice";
import { buscarClima, buscarEnsemble } from "@/lib/openmeteo";
import { prepararHoras } from "./agua";
import { calcularAstro } from "./astro";
import { agruparDias, avaliarDia, brutosDoDia, confiancaTabela, fraseMotivo, percentil } from "./calculo";
import type { Astro, DiaClima, DiaPrevisao, Fase, HoraClima, Local, NivelConfianca, NotaEspecie, Previsao, SerieClima } from "./tipos";

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

function textoBloqueio(d: DiaClima): string | null {
  if (d.tempestade) return "Tempestade prevista";
  if (d.ventoMax > SEGURANCA.ventoMax) return `Vento de até ${Math.round(d.ventoMax)} m/s`;
  return null;
}

function horasPorDia(horas: HoraClima[]): Map<string, HoraClima[]> {
  const mapa = new Map<string, HoraClima[]>();
  for (const h of horas) {
    if (!mapa.has(h.data)) mapa.set(h.data, []);
    mapa.get(h.data)!.push(h);
  }
  return mapa;
}

/** Nota de cada espécie em cada cenário do ensemble, indexada por data. */
function notasDosCenarios(cenarios: SerieClima[], local: Local, astroPorData: Map<string, Astro>) {
  const porData = new Map<string, Record<EspecieId, number[]>>();
  for (const serie of cenarios) {
    for (const [data, horas] of horasPorDia(prepararHoras(serie, local))) {
      const astro = astroPorData.get(data);
      if (!astro) continue;
      if (!porData.has(data)) {
        porData.set(data, Object.fromEntries(ESPECIE_IDS.map((id) => [id, [] as number[]])) as unknown as Record<EspecieId, number[]>);
      }
      for (const id of ESPECIE_IDS) porData.get(data)![id].push(avaliarDia(horas, ESPECIES[id], astro).nota);
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
}): Previsao {
  const { local, locais, serie, offsetSeg, cenarios, hoje, agora } = args;
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
  const cen = cenarios?.length ? notasDosCenarios(cenarios, local, astroPorData) : null;

  const saida: DiaPrevisao[] = [];
  for (let i = inicio; i < dias.length; i++) {
    const d = dias[i];
    const k = i - inicio;
    const astro = astroPorData.get(d.data)!;
    const brutos = brutosDoDia(dias, i, aguaPorDia);
    const fase = faseDoDia(k);
    const pct = confiancaTabela(k, CONFIANCA_TABELA);
    const notasCen = cen?.get(d.data);
    const horasDoDia = porDia.get(d.data) ?? [];
    let maiorLargura = 0;

    const especies = {} as Record<EspecieId, NotaEspecie>;
    for (const id of ESPECIE_IDS) {
      const av = avaliarDia(horasDoDia, ESPECIES[id], astro);
      const { hora, tempAgua, deltaAgua48h, deltaPressao24h, vento, chuva48h, nuvens } = av.melhor;
      const base = { hora, tempAgua, deltaAgua48h, deltaPressao24h, vento, chuva48h, nuvens };
      if (fase === "tendencia") {
        especies[id] = { nota: null, min: null, max: null, fatores: av.fatores, horario: av.horario, base, horas: null, motivo: "" };
        continue;
      }
      const lista = notasCen?.[id]?.slice().sort((a, b) => a - b);
      let nota = av.nota;
      let min: number;
      let max: number;
      if (lista?.length) {
        const p10 = Math.round(percentil(lista, 0.1));
        const p90 = Math.round(percentil(lista, 0.9));
        if (fase === "faixa") nota = Math.round(percentil(lista, 0.5));
        min = Math.min(p10, nota);
        max = Math.max(p90, nota);
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
        motivo: fraseMotivo(id, nota, av.fatores, av.melhor),
      };
    }

    saida.push({
      data: d.data,
      fase,
      astro,
      brutos,
      confianca: fase === "tendencia" ? "baixa" : notasCen ? nivelPorFaixa(maiorLargura) : nivelPorTabela(pct),
      bloqueio: fase === "tendencia" ? null : textoBloqueio(d),
      horasInseguras: d.horasInseguras,
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
  };
}

export async function gerarPrevisao(local: Local, locais: Local[], agora = new Date()): Promise<Previsao> {
  const { serie, offsetSeg } = await buscarClima(local.lat, local.lon);
  let cenarios: SerieClima[] | null = null;
  try {
    cenarios = await buscarEnsemble(local.lat, local.lon, serie);
  } catch (err) {
    console.warn("Ensemble indisponível, usando a tabela de confiança:", err);
  }
  return montarPrevisao({ local, locais, serie, offsetSeg, cenarios, hoje: hojeEmSaoPaulo(agora), agora });
}
