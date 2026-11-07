import type { EstadoFonte } from "./guardar";

export interface LinhaStatus {
  fonte: string;
  nome: string;
  grupo: string;
  ultimaTentativa: Date | string;
  ultimoSucesso: Date | string | null;
  dadoDe: Date | string | null;
  erro: string | null;
}

/** Por quanto tempo um acerto vale: previsão 2 h, estação e rio 6 h, ONS e conferência diária 2 dias. */
function validadeSeg(l: Pick<LinhaStatus, "fonte" | "grupo">) {
  if (l.grupo === "ONS" || l.fonte.includes("conferencia")) return 2 * 86_400;
  if (l.grupo === "Open-Meteo") return 2 * 3600;
  return 6 * 3600;
}

const ms = (d: Date | string | null) => (d ? new Date(d).getTime() : null);

/** ok: dado recente. atrasada: usando dado velho (ou ainda buscando). falhou: a última tentativa deu erro e não há dado recente. */
export function estadoDaFonte(l: LinhaStatus, agora = Date.now()): EstadoFonte {
  const sucesso = ms(l.ultimoSucesso);
  const recente = sucesso !== null && agora - sucesso < validadeSeg(l) * 1000;
  if (l.erro) return recente ? "atrasada" : "falhou";
  return recente ? "ok" : "atrasada";
}
