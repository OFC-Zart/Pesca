import {
  CONFIANCA_FAIXA,
  CONFIANCA_RESERVA,
  CONFIANCA_TABELA,
  ESPECIES,
  ESPECIE_IDS,
  FASES,
  SEGURANCA,
  type EspecieId,
} from "@/config/indice";
import { buscarClima, buscarEnsemble } from "@/lib/openmeteo";
import { calcularAstro } from "./astro";
import {
  agruparDias,
  calcularBrutos,
  calcularFatores,
  confiancaTabela,
  fraseMotivo,
  notasPorHora,
  percentil,
  somarNota,
} from "./calculo";
import type { Astro, DiaClima, DiaPrevisao, Fase, Local, NivelConfianca, NotaEspecie, Previsao, SerieClima } from "./tipos";

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

/** Nota de cada espécie em cada cenário do ensemble, indexada por data. */
function notasDosCenarios(cenarios: SerieClima[], local: Local, astroPorData: Map<string, Astro>) {
  const porData = new Map<string, Record<EspecieId, number[]>>();
  for (const serie of cenarios) {
    const dias = agruparDias(serie);
    dias.forEach((d, i) => {
      const astro = astroPorData.get(d.data);
      if (!astro) return;
      const brutos = calcularBrutos(dias, i, local);
      if (!porData.has(d.data)) {
        porData.set(d.data, Object.fromEntries(ESPECIE_IDS.map((id) => [id, [] as number[]])) as unknown as Record<EspecieId, number[]>);
      }
      for (const id of ESPECIE_IDS) {
        porData.get(d.data)![id].push(somarNota(calcularFatores(brutos, astro.idadeLua, ESPECIES[id])));
      }
    });
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
    const brutos = calcularBrutos(dias, i, local);
    const fase = faseDoDia(k);
    const pct = confiancaTabela(k, CONFIANCA_TABELA);
    const notasCen = cen?.get(d.data);
    let maiorLargura = 0;

    const especies = {} as Record<EspecieId, NotaEspecie>;
    for (const id of ESPECIE_IDS) {
      const e = ESPECIES[id];
      const fatores = calcularFatores(brutos, astro.idadeLua, e);
      if (fase === "tendencia") {
        especies[id] = { nota: null, min: null, max: null, fatores, horas: null, motivo: "" };
        continue;
      }
      const base = somarNota(fatores);
      const lista = notasCen?.[id]?.slice().sort((a, b) => a - b);
      let nota = base;
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
        min = Math.max(0, base - margem);
        max = Math.min(100, base + margem);
      }
      maiorLargura = Math.max(maiorLargura, max - min);
      especies[id] = {
        nota,
        min,
        max,
        fatores,
        horas: fase === "completa" ? notasPorHora(nota, e, astro) : null,
        motivo: fraseMotivo(id, nota, fatores, brutos),
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
