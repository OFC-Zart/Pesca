import type { Astro, Brutos } from "@/lib/indice/tipos";

export type Momento = "noite" | "amanhecer" | "dia" | "entardecer";

type Sol = Pick<Astro, "nascerSol" | "porSol">;

/** O céu do cartão acompanha o sol de verdade: uma hora antes e depois do nascer e do pôr. */
export function momentoDoDia(hora: number, a: Sol): Momento {
  const nascer = a.nascerSol ?? 6;
  const por = a.porSol ?? 18;
  if (hora >= nascer - 1 && hora < nascer + 1) return "amanhecer";
  if (hora >= por - 1 && hora < por + 1) return "entardecer";
  if (hora >= nascer + 1 && hora < por - 1) return "dia";
  return "noite";
}

const limitar = (v: number) => Math.max(0, Math.min(1, v));

/** Onde desenhar o sol ou a lua, em % do cartão, num arco que sobe e desce. */
export function posicaoNoCeu(hora: number, a: Sol): { esquerda: number; topo: number; deNoite: boolean } {
  const nascer = a.nascerSol ?? 6;
  const por = a.porSol ?? 18;
  const deNoite = hora < nascer - 1 || hora >= por + 1;
  const t = deNoite ? limitar(((hora < nascer ? hora + 24 : hora) - por) / (24 - por + nascer)) : limitar((hora - nascer) / (por - nascer));
  return { esquerda: 10 + 78 * t, topo: 40 - 30 * Math.sin(Math.PI * t), deNoite };
}

export type Tempo = "limpo" | "poucas-nuvens" | "nublado" | "chuva";

export function tempoDoDia(b: Pick<Brutos, "nuvens" | "chuva48h">): Tempo {
  if (b.chuva48h > 10) return "chuva";
  if (b.nuvens > 70) return "nublado";
  if (b.nuvens > 30) return "poucas-nuvens";
  return "limpo";
}

export const NOME_TEMPO: Record<Tempo, string> = {
  limpo: "Céu limpo",
  "poucas-nuvens": "Poucas nuvens",
  nublado: "Nublado",
  chuva: "Chuva recente",
};

/** Quantas nuvens passam no cenário, de acordo com a cobertura do dia. */
export function quantasNuvens(pct: number): number {
  if (pct < 20) return 0;
  if (pct < 50) return 1;
  if (pct < 80) return 2;
  return 3;
}
