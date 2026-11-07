import {
  AGUA,
  AGUA_ESTAVEL_DELTA,
  ESCALA,
  ESPECIES,
  JANELA,
  PESOS,
  SEGURANCA,
  type Especie,
  type EspecieId,
  type FatorId,
  type TipoAgua,
} from "@/config/indice";
import type { Astro, Brutos, DiaClima, Fatores, Local, SerieClima } from "./tipos";

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/** Curva trapezoidal: 1 na faixa ótima, caindo em linha reta até 0 nos limites. */
export function trapezio(t: number, e: Pick<Especie, "min" | "otMin" | "otMax" | "max">): number {
  if (t <= e.min || t >= e.max) return 0;
  if (t < e.otMin) return (t - e.min) / (e.otMin - e.min);
  if (t > e.otMax) return (e.max - t) / (e.max - e.otMax);
  return 1;
}

export function notaLua(idadeDias: number): number {
  return 0.5 + 0.5 * Math.abs(Math.cos((2 * Math.PI * idadeDias) / 29.53));
}

export function notaPressao(delta24h: number): number {
  if (delta24h > 4) return 0.2;
  if (delta24h < -6) return 0.6;
  if (delta24h < -2) return 1;
  return 0.8;
}

export function notaVento(v: number): number {
  if (v < 1) return 0.6;
  if (v <= 5) return 1;
  if (v <= 8) return 0.5;
  return 0.1;
}

export function notaChuva(mm48h: number, e: Pick<Especie, "chuvaForte">): number {
  if (mm48h <= 10) return 1;
  if (mm48h <= 30) return 0.6;
  return e.chuvaForte;
}

export function notaNuvens(pct: number, e: Pick<Especie, "ceuLimpo">): number {
  if (pct >= 40 && pct <= 80) return 1;
  return pct < 40 ? e.ceuLimpo : 0.6;
}

/** 1 esquentando rumo ao ótimo, 0,5 estável, 0,2 se esfriou mais de 3 °C em 48 h. */
export function notaTendencia(tempAgua: number, delta48h: number, e: Pick<Especie, "otMax">): number {
  if (delta48h < -3) return 0.2;
  if (delta48h >= AGUA_ESTAVEL_DELTA && tempAgua <= e.otMax) return 1;
  return 0.5;
}

export function escala(nota: number) {
  return ESCALA.find((n) => nota <= n.ate) ?? ESCALA[ESCALA.length - 1];
}

export function somarNota(f: Fatores): number {
  let s = 0;
  for (const k of Object.keys(PESOS) as FatorId[]) s += PESOS[k] * f[k];
  return Math.round(100 * s);
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

export function mediaAr(dias: DiaClima[], i: number, n: number): number {
  return media(dias.slice(Math.max(0, i - n + 1), i + 1).map((d) => d.temp));
}

/** Temperatura da água: regressão do local quando existe, senão a estimativa pelo tipo de água. */
export function estimarAgua(dias: DiaClima[], i: number, local: Pick<Local, "tipo" | "calibA" | "calibB">): number {
  const cfg = AGUA[local.tipo];
  const ar = mediaAr(dias, i, cfg.dias);
  if (local.calibA != null && local.calibB != null) return local.calibA + local.calibB * ar;
  return cfg.a + cfg.b * ar;
}

export function diasDaMedia(tipo: TipoAgua): number {
  return AGUA[tipo].dias;
}

export function regressao(pontos: { x: number; y: number }[]): { a: number; b: number } | null {
  const n = pontos.length;
  if (n < 2) return null;
  const mx = media(pontos.map((p) => p.x));
  const my = media(pontos.map((p) => p.y));
  const sxx = pontos.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const sxy = pontos.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}

export function calcularBrutos(dias: DiaClima[], i: number, local: Local): Brutos {
  const d = dias[i];
  const ontem = dias[i - 1] ?? d;
  const tempAgua = estimarAgua(dias, i, local);
  const agua48h = i >= 2 ? estimarAgua(dias, i - 2, local) : tempAgua;
  return {
    tempAgua,
    deltaAgua48h: tempAgua - agua48h,
    deltaPressao24h: d.pressao - ontem.pressao,
    vento: d.vento,
    chuva48h: d.chuva + ontem.chuva,
    nuvens: d.nuvens,
    tempAr: d.temp,
  };
}

export function calcularFatores(b: Brutos, idadeLua: number, e: Especie): Fatores {
  return {
    agua: trapezio(b.tempAgua, e),
    tendencia: notaTendencia(b.tempAgua, b.deltaAgua48h, e),
    pressao: notaPressao(b.deltaPressao24h),
    vento: notaVento(b.vento),
    chuva: notaChuva(b.chuva48h, e),
    lua: notaLua(idadeLua),
    nuvens: notaNuvens(b.nuvens, e),
  };
}

const dentro = (hora: number, alvo: number | null, raio: number) => {
  if (alvo === null) return false;
  const d = Math.abs(hora - alvo);
  return Math.min(d, 24 - d) <= raio;
};

/**
 * Valor da janela para o centro de cada hora.
 * Diurno e noturno seguem as faixas fixas do perfil e 0,3 fora delas.
 * Crepuscular e misto usam sol ±1 h e, no resto do dia, os períodos solunares.
 */
export function janelaDaHora(h: number, periodo: Especie["periodo"], a: Astro): number {
  const c = h + 0.5;
  if (periodo === "diurno") return h >= JANELA.diurnoDe && h < JANELA.diurnoAte ? JANELA.sol : JANELA.resto;
  if (periodo === "noturno") return h >= JANELA.noturnoDe || h < JANELA.noturnoAte ? JANELA.noturno : JANELA.resto;
  if (dentro(c, a.nascerSol, 1) || dentro(c, a.porSol, 1)) return JANELA.sol;
  if (dentro(c, a.luaAlta, 1) || dentro(c, a.luaBaixa, 1)) return JANELA.solunarMaior;
  if (dentro(c, a.nascerLua, 0.5) || dentro(c, a.porLua, 0.5)) return JANELA.solunarMenor;
  return JANELA.resto;
}

export function notasPorHora(notaDia: number, e: Especie, a: Astro): number[] {
  return Array.from({ length: 24 }, (_, h) => Math.round(notaDia * (0.7 + 0.3 * janelaDaHora(h, e.periodo, a))));
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

const NOME_FATOR: Record<FatorId, string> = {
  agua: "água",
  tendencia: "tendência da água",
  pressao: "pressão",
  vento: "vento",
  chuva: "chuva",
  lua: "lua",
  nuvens: "nuvens",
};

export const fmt = (n: number, casas = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: 0 });

/** Frase curta com o principal motivo: o que mais tirou pontos, ou o que mais ajudou num dia bom. */
export function fraseMotivo(id: EspecieId, nota: number, f: Fatores, b: Brutos): string {
  const e = ESPECIES[id];
  const perda = (Object.keys(PESOS) as FatorId[])
    .map((k) => ({ k, v: PESOS[k] * (1 - f[k]) }))
    .sort((x, y) => y.v - x.v)[0];

  if (nota >= 71 || perda.v < 0.02) {
    if (f.agua >= 1) return `Água a ${fmt(b.tempAgua)} °C, bem na faixa boa da ${e.nome.toLowerCase()}.`;
    return `A ${NOME_FATOR[perda.k]} ainda pesa um pouco, mas o resto do dia ajuda.`;
  }
  switch (perda.k) {
    case "agua":
      if (b.tempAgua < e.otMin) return `Água fria: ${fmt(b.tempAgua)} °C estimados, e a ${e.nome.toLowerCase()} gosta de ${e.otMin}–${e.otMax} °C.`;
      return `Água quente demais: ${fmt(b.tempAgua)} °C estimados, acima dos ${e.otMin}–${e.otMax} °C que ela prefere.`;
    case "tendencia":
      return b.deltaAgua48h < -3 ? "A água esfriou mais de 3 °C em 48 h." : "A água está parada, sem esquentar rumo ao ótimo.";
    case "pressao":
      return b.deltaPressao24h > 4 ? "Pressão subindo rápido: sinal de frente fria passando." : `Pressão variou ${fmt(b.deltaPressao24h)} hPa em 24 h, fora do melhor ponto.`;
    case "vento":
      return b.vento < 1 ? "Quase sem vento: a água fica parada e clara." : `Vento médio de ${fmt(b.vento)} m/s atrapalha a pescaria.`;
    case "chuva":
      return `${fmt(b.chuva48h, 0)} mm de chuva em 48 h: a água tende a ficar barrenta.`;
    case "lua":
      return "A lua é o que mais tira pontos, e ela vale pouco. Dia equilibrado.";
    case "nuvens":
      return b.nuvens < 40 ? "Céu limpo demais: muita luz na água." : "Céu muito fechado, fora da faixa de 40 a 80% de nuvens.";
  }
}
