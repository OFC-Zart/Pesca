import type { NivelConfianca } from "@/lib/indice/tipos";

export function horaTexto(decimal: number | null): string {
  if (decimal === null) return "–";
  const total = Math.round(((decimal % 24) + 24) % 24 * 60);
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const utc = (data: string) => new Date(`${data}T12:00:00Z`);

export function diaSemana(data: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(utc(data)).replace(".", "");
}

export function diaMes(data: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(utc(data));
}

export function diaLongo(data: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(utc(data));
}

/** Data e hora atuais em Cerro Negro, seja qual for o fuso do aparelho. */
export function agoraEmCerroNegro(agora = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const v = (t: string) => p.find((x) => x.type === t)!.value;
  return { data: `${v("year")}-${v("month")}-${v("day")}`, hora: Number(v("hour")), minuto: Number(v("minute")), horaTexto: `${v("hour")}:${v("minute")}` };
}

export function horaDoIso(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export const TEXTO_CONFIANCA: Record<NivelConfianca, string> = { alta: "alta", media: "média", baixa: "baixa" };

export const COR_NOTA: Record<string, string> = {
  Fraco: "#8a6a45",
  Regular: "#ab8e55",
  Bom: "#7f9a3f",
  "Muito bom": "#9dbd45",
  Excelente: "#c9e96b",
};

export function piracemaAtiva(agora = new Date()): boolean {
  const mes = Number(agoraEmCerroNegro(agora).data.slice(5, 7));
  return mes >= 10 || mes === 1;
}
