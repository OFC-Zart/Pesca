import {
  ESCALA,
  ESPECIES,
  EXPOENTE_APETITE,
  EXPOENTE_CONDICOES,
  HORAS_DA_NOTA,
  PESOS,
  REPRESA,
  RIO,
  SEGURANCA,
  type CondicaoId,
  type Especie,
  type EspecieId,
  type Pesos,
} from "@/config/indice";
import type { Astro, Brutos, DiaClima, Fatores, HoraClima, SerieClima } from "./tipos";

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const limitar = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Apetite pela temperatura da água, de 0 a 1. É o limite de tudo: abaixo de `min` o peixe praticamente não come,
 * e o resto do clima não salva. Abaixo do ótimo a curva é côncava, porque o metabolismo acelera com o calor.
 */
export function apetite(t: number, e: Pick<Especie, "min" | "otMin" | "otMax" | "max">): number {
  if (t <= e.min || t >= e.max) return 0;
  if (t < e.otMin) return ((t - e.min) / (e.otMin - e.min)) ** EXPOENTE_APETITE;
  if (t > e.otMax) return (e.max - t) / (e.max - e.otMax);
  return 1;
}

export function notaLua(idadeDias: number): number {
  return 0.5 + 0.5 * Math.abs(Math.cos((2 * Math.PI * idadeDias) / 29.53));
}

/** A pressão não age direto no peixe; subindo rápido, ela denuncia a frente fria que passou. */
export function notaPressao(delta24h: number): number {
  if (delta24h > 4) return 0.3;
  if (delta24h < -6) return 0.65;
  if (delta24h < -2) return 1;
  return 0.85;
}

export function notaVento(v: number): number {
  if (v < 1) return 0.7;
  if (v <= 5) return 1;
  if (v <= 8) return 0.55;
  return 0.15;
}

/** Chuva forte embarra a água, e isso pesa conforme o peixe caça com a visão ou com o olfato. */
export function notaChuva(mm48h: number, mmAgora: number, e: Pick<Especie, "chuvaForte">): number {
  const acumulado = mm48h <= 10 ? 1 : mm48h <= 30 ? (1 + e.chuvaForte) / 2 : e.chuvaForte;
  return mmAgora >= 4 ? acumulado * 0.7 : acumulado;
}

/** Céu só importa de dia: tira a luz forte da água, e cada peixe reage de um jeito ao céu limpo. */
export function notaNuvens(pct: number, deDia: boolean, e: Pick<Especie, "ceuLimpo">): number {
  if (!deDia) return 1;
  if (pct >= 40 && pct <= 80) return 1;
  return pct < 40 ? e.ceuLimpo : 0.85;
}

const QUEDA: [number, number][] = [[-4, 0.1], [-2, 0.45], [-1, 0.7], [-0.3, 0.9], [0.3, 0.92], [1, 1]];

/** Frente fria é o que mais derruba o peixe: a nota cai junto com a água. Esfriar só ajuda quando a água está quente demais. */
export function notaTendencia(t: number, delta48h: number, e: Pick<Especie, "otMax">): number {
  if (t > e.otMax) return delta48h < 0 ? 1 : 0.7;
  if (delta48h <= QUEDA[0][0]) return QUEDA[0][1];
  for (let i = 1; i < QUEDA.length; i++) {
    const [x0, y0] = QUEDA[i - 1];
    const [x1, y1] = QUEDA[i];
    if (delta48h <= x1) return y0 + ((y1 - y0) * (delta48h - x0)) / (x1 - x0);
  }
  return 1;
}

/** Rio subindo é água barrenta e perigo; descendo devagar ainda atrapalha um pouco. */
export function notaRio(subida24hCm: number): number {
  if (subida24hCm > RIO.cheia.de) return RIO.cheia.nota;
  if (subida24hCm > RIO.subindo.de) return RIO.subindo.nota;
  if (subida24hCm > RIO.estavel) return RIO.subindoDevagar;
  if (subida24hCm < -RIO.estavel) return RIO.descendo;
  return 1;
}

/** Represa esvaziando expõe a margem e espalha o peixe; subir ou ficar parada não tira nada. */
export function notaRepresa(variacao7dM: number): number {
  if (variacao7dM < -REPRESA.quedaForte.de) return REPRESA.quedaForte.nota;
  if (variacao7dM <= -REPRESA.queda.de) return REPRESA.queda.nota;
  return 1;
}

/** O que muda de um local para outro na conta: os pesos do tipo de água e o nível medido do rio ou da represa. */
export interface Contexto {
  pesos: Pesos;
  rio: number;
  represa: number;
}

export const CONTEXTO_PADRAO: Contexto = { pesos: PESOS, rio: 1, represa: 1 };

export function escala(nota: number) {
  return ESCALA.find((n) => nota <= n.ate) ?? ESCALA[ESCALA.length - 1];
}

const ehDia = (c: number, a: Pick<Astro, "nascerSol" | "porSol">) => c >= (a.nascerSol ?? 6) && c <= (a.porSol ?? 18);

/**
 * Quanto a hora favorece o peixe pela luz. O amanhecer e o entardecer valem cheio até 1 h do sol e somem aos poucos até 2,5 h.
 * A noite perde um pouco de força até o fim: o começo da noite costuma render mais que a madrugada fria (ESTIMATIVA).
 */
export function janelaDeLuz(hora: number, e: Pick<Especie, "luz">, a: Pick<Astro, "nascerSol" | "porSol">): number {
  const c = hora + 0.5;
  const nascer = a.nascerSol ?? 6;
  const por = a.porSol ?? 18;
  let base: number = e.luz.dia;
  if (!ehDia(c, a)) {
    const desdeOPor = (c >= por ? c : c + 24) - por;
    base = e.luz.noite * (1 - 0.15 * limitar(desdeOPor / (24 - por + nascer)));
  }
  const perto = Math.min(Math.abs(c - nascer), Math.abs(c - por));
  const peso = limitar((2.5 - perto) / 1.5);
  return base + (e.luz.crepusculo - base) * peso;
}

export function fatoresDaHora(h: HoraClima, e: Especie, a: Astro, ctx: Contexto = CONTEXTO_PADRAO): Fatores {
  return {
    agua: apetite(h.tempAgua, e),
    tendencia: notaTendencia(h.tempAgua, h.deltaAgua48h, e),
    pressao: notaPressao(h.deltaPressao24h),
    vento: notaVento(h.vento),
    chuva: notaChuva(h.chuva48h, h.chuvaHora, e),
    nuvens: notaNuvens(h.nuvens, ehDia(h.hora + 0.5, a), e),
    lua: notaLua(a.idadeLua),
    rio: ctx.rio,
    represa: ctx.represa,
  };
}

/** Média ponderada das condições do momento, de 0 a 1. */
export function condicoes(f: Fatores, pesos: Pesos = PESOS): number {
  let s = 0;
  for (const k of Object.keys(pesos) as CondicaoId[]) s += pesos[k] * (f[k] ?? 1);
  return s;
}

/** Nota = 100 × apetite × horário × condições². Como é produto, qualquer limite forte derruba o resultado. */
export function notaDaHora(f: Fatores, horario: number, pesos: Pesos = PESOS): number {
  return Math.round(100 * f.agua * horario * condicoes(f, pesos) ** EXPOENTE_CONDICOES);
}

export interface AvaliacaoDia {
  nota: number;
  horas: number[];
  melhor: HoraClima;
  fatores: Fatores;
  horario: number;
}

/** Nota de cada hora e nota do dia, que é a média das melhores horas: um dia vale pela janela boa que oferece. */
export function avaliarDia(horas: HoraClima[], e: Especie, a: Astro, ctx: Contexto = CONTEXTO_PADRAO): AvaliacaoDia {
  const notas = new Array<number>(24).fill(0);
  let melhor = horas[0];
  let maior = -1;
  const presentes: number[] = [];
  for (const h of horas) {
    const n = notaDaHora(fatoresDaHora(h, e, a, ctx), janelaDeLuz(h.hora, e, a), ctx.pesos);
    notas[h.hora] = n;
    presentes.push(n);
    if (n > maior) {
      maior = n;
      melhor = h;
    }
  }
  const topo = presentes.sort((x, y) => y - x).slice(0, HORAS_DA_NOTA);
  return { nota: Math.round(media(topo)), horas: notas, melhor, fatores: fatoresDaHora(melhor, e, a, ctx), horario: janelaDeLuz(melhor.hora, e, a) };
}

/** Agrupa a série horária por dia local. Horas sem dado são ignoradas; dia sem dado de temperatura é descartado. */
export function agruparDias(s: SerieClima): DiaClima[] {
  const dias = new Map<string, number[]>();
  s.tempo.forEach((t, i) => {
    const d = t.slice(0, 10);
    if (!dias.has(d)) dias.set(d, []);
    dias.get(d)!.push(i);
  });
  const nums = (arr: (number | null)[], idx: number[]) =>
    idx.map((i) => arr[i]).filter((x): x is number => x !== null && x !== undefined);

  const out: DiaClima[] = [];
  for (const [data, idx] of dias) {
    const temp = nums(s.temp, idx);
    if (!temp.length) continue;
    const vento = nums(s.vento, idx);
    const horasInseguras = idx
      .filter((i) => {
        const c = s.codigo[i];
        const v = s.vento[i];
        return (c != null && c >= SEGURANCA.tempestadeDe && c <= SEGURANCA.tempestadeAte) || (v != null && v > SEGURANCA.ventoMax);
      })
      .map((i) => Number(s.tempo[i].slice(11, 13)));
    out.push({
      data,
      temp: media(temp),
      pressao: media(nums(s.pressao, idx)),
      vento: media(vento),
      ventoMax: vento.length ? Math.max(...vento) : 0,
      chuva: nums(s.chuva, idx).reduce((a, b) => a + b, 0),
      nuvens: media(nums(s.nuvens, idx)),
      tempestade: idx.some((i) => {
        const c = s.codigo[i];
        return c != null && c >= SEGURANCA.tempestadeDe && c <= SEGURANCA.tempestadeAte;
      }),
      horasInseguras,
    });
  }
  return out;
}

/** Os números do dia para mostrar na tela. */
export function brutosDoDia(dias: DiaClima[], i: number, aguaPorDia: Map<string, number>): Brutos {
  const d = dias[i];
  const ontem = dias[i - 1] ?? d;
  const agua = aguaPorDia.get(d.data) ?? d.temp;
  const anteontem = dias[i - 2] ? (aguaPorDia.get(dias[i - 2].data) ?? agua) : agua;
  return {
    tempAgua: agua,
    deltaAgua48h: agua - anteontem,
    deltaPressao24h: d.pressao - ontem.pressao,
    vento: d.vento,
    chuva48h: d.chuva + ontem.chuva,
    nuvens: d.nuvens,
    tempAr: d.temp,
  };
}

export function melhorHora(horas: number[], aPartirDe = 0): number {
  let melhor = aPartirDe;
  for (let h = aPartirDe; h < horas.length; h++) if (horas[h] > horas[melhor]) melhor = h;
  return melhor;
}

export function percentil(ordenado: number[], p: number): number {
  if (!ordenado.length) return 0;
  const pos = (ordenado.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (pos - lo);
}

export function confiancaTabela(diasAFrente: number, tabela: readonly (readonly [number, number])[]): number {
  for (let i = 1; i < tabela.length; i++) {
    const [d0, c0] = tabela[i - 1];
    const [d1, c1] = tabela[i];
    if (diasAFrente <= d1) return Math.round(c0 + ((c1 - c0) * (diasAFrente - d0)) / (d1 - d0));
  }
  return tabela[tabela.length - 1][1];
}

export const fmt = (n: number, casas = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: 0 });

type Base = Pick<HoraClima, "tempAgua" | "deltaAgua48h" | "deltaPressao24h" | "vento" | "chuva48h" | "nuvens">;

/** Frase curta com o principal motivo: a água, quando ela limita; senão, a condição que mais tirou. */
export function fraseMotivo(id: EspecieId, nota: number, f: Fatores, b: Base, pesos: Pesos = PESOS): string {
  const e: Especie = ESPECIES[id];
  const peixe = `${e.artigo} ${e.nome.toLowerCase()}`;
  const t = fmt(b.tempAgua);
  if (f.agua === 0) {
    if (b.tempAgua <= e.min) return `Água a ${t} °C: abaixo de ${e.min} °C, ${peixe} praticamente não come.`;
    return `Água a ${t} °C: quente demais, acima do limite de ${e.max} °C.`;
  }
  if (f.agua < 0.6) {
    if (b.tempAgua < e.otMin) return `Água fria: ${t} °C estimados, e ${peixe} só come bem a partir de ${e.otMin} °C.`;
    return `Água quente: ${t} °C estimados, acima dos ${e.otMin}–${e.otMax} °C que ${peixe} prefere.`;
  }
  const perda = (Object.keys(pesos) as CondicaoId[]).map((k) => ({ k, v: pesos[k] * (1 - (f[k] ?? 1)) })).sort((x, y) => y.v - x.v)[0];
  if (nota >= 71 || perda.v < 0.03) {
    if (f.agua >= 1) return `Água a ${t} °C, bem na faixa boa para ${peixe}, e o clima ajuda.`;
    return `Água a ${t} °C, ainda abaixo do ideal, mas o clima ajuda.`;
  }
  switch (perda.k) {
    case "tendencia":
      return `A água esfriou ${fmt(Math.abs(b.deltaAgua48h))} °C em 48 h: peixe costuma sentir a queda.`;
    case "pressao":
      return b.deltaPressao24h > 4 ? "Pressão subindo rápido: sinal de frente fria passando." : `Pressão variou ${fmt(b.deltaPressao24h)} hPa em 24 h.`;
    case "vento":
      return b.vento < 1 ? "Quase sem vento: a água fica parada e clara." : `Vento de ${fmt(b.vento)} m/s atrapalha a pescaria.`;
    case "chuva":
      return `${fmt(b.chuva48h, 0)} mm de chuva em 48 h: a água tende a ficar barrenta.`;
    case "nuvens":
      return b.nuvens < 40 ? "Céu limpo demais: muita luz na água." : "Céu muito fechado.";
    case "lua":
      return "Dia equilibrado: a lua é o que mais tira, e ela vale pouco.";
    case "rio":
      if (f.rio <= RIO.cheia.nota) return "Rio em cheia: subiu mais de 1 m em 24 h. Cuidado na margem.";
      if (f.rio <= RIO.subindo.nota) return "Rio subindo mais de 30 cm em 24 h: água barrenta e correnteza forte.";
      if (f.rio === RIO.descendo) return "Rio baixando depois de subir: a água ainda está turva.";
      return "Rio subindo devagar: a água começa a turvar.";
    case "represa":
      return "A represa está baixando: a margem muda e o peixe se espalha.";
  }
}
