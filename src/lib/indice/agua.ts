import { AGUA, FAIXA_PARA_RETA, MARGEM, MEDICOES_PARA_CALIBRAR, MEDICOES_PARA_RETA, TAU_POR_METRO } from "@/config/indice";
import type { HoraClima, Local, SerieClima } from "./tipos";

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/** Dias que o corpo d'água leva para acompanhar uma mudança de clima. */
export function inerciaDoLocal(local: Pick<Local, "tipo" | "profundidade">): number {
  const cfg = AGUA[local.tipo];
  if (cfg.tau !== undefined) return cfg.tau;
  return (local.profundidade ?? cfg.profundidade ?? 2.5) * TAU_POR_METRO;
}

/** Repete o último valor conhecido onde a série tem buraco. */
function preencher(v: (number | null)[], reserva: number): number[] {
  let ultimo = reserva;
  return v.map((x) => {
    if (x !== null && x !== undefined) ultimo = x;
    return ultimo;
  });
}

/**
 * Estima a água hora a hora: ela corre atrás de um alvo (ar + calor do sol), mais devagar quanto mais fundo.
 * Duas camadas: o corpo do açude, que quase não oscila no dia, e a margem rasa, que aquece à tarde.
 */
export function simularAgua(serie: Pick<SerieClima, "temp" | "sol">, local: Pick<Local, "tipo" | "profundidade">): number[] {
  const cfg = AGUA[local.tipo];
  const ar = preencher(serie.temp, serie.temp.find((t) => t !== null) ?? 15);
  const sol = preencher(serie.sol, 0);
  const a = cfg.a ?? 0;
  const b = cfg.b ?? 1;
  const passoCorpo = 1 / (inerciaDoLocal(local) * 24);
  const passoMargem = 1 / (MARGEM.tau * 24);
  let corpo = a + b * media(ar.slice(0, 120));
  let margem = corpo;
  return ar.map((t, i) => {
    const alvo = a + b * t + cfg.beta * sol[i];
    corpo += (alvo - corpo) * passoCorpo;
    margem += (alvo - margem) * passoMargem;
    return (1 - MARGEM.peso) * corpo + MARGEM.peso * margem;
  });
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

/**
 * Calibração pelo termômetro do local. Com poucas medições, ou todas numa temperatura parecida,
 * uma reta inclinada seria ruído: só se corrige o desvio médio. A reta inteira exige medições em épocas diferentes.
 */
export function calibrar(pontos: { x: number; y: number }[]): { a: number; b: number } | null {
  if (pontos.length < MEDICOES_PARA_CALIBRAR) return null;
  const xs = pontos.map((p) => p.x);
  if (pontos.length >= MEDICOES_PARA_RETA && Math.max(...xs) - Math.min(...xs) >= FAIXA_PARA_RETA) {
    const reta = regressao(pontos);
    if (reta && reta.b >= 0.5 && reta.b <= 1.5) return reta;
  }
  return { a: media(pontos.map((p) => p.y - p.x)), b: 1 };
}

/** Junta o clima de cada hora com a água estimada e as variações que a nota usa. */
export function prepararHoras(serie: SerieClima, local: Local): HoraClima[] {
  const modelo = simularAgua(serie, local);
  const calibra = (x: number) => (local.calibA != null && local.calibB != null ? local.calibA + local.calibB * x : x);
  const agua = modelo.map(calibra);
  const ar = preencher(serie.temp, 15);
  const pressao = preencher(serie.pressao, 1015);
  const vento = preencher(serie.vento, 3);
  const nuvens = preencher(serie.nuvens, 50);
  const chuva = serie.chuva.map((c) => c ?? 0);

  let chuva48h = 0;
  return serie.tempo.map((t, i) => {
    chuva48h += chuva[i];
    if (i >= 48) chuva48h -= chuva[i - 48];
    return {
      data: t.slice(0, 10),
      hora: Number(t.slice(11, 13)),
      tempAr: ar[i],
      tempAgua: agua[i],
      aguaModelo: modelo[i],
      deltaAgua48h: agua[i] - agua[Math.max(0, i - 48)],
      deltaPressao24h: pressao[i] - pressao[Math.max(0, i - 24)],
      vento: vento[i],
      chuvaHora: chuva[i],
      chuva48h: Math.max(0, chuva48h),
      nuvens: nuvens[i],
    };
  });
}
