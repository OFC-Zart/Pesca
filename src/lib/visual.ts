import { Cloud, CloudRain, Dam, Gauge, Moon, Thermometer, TrendingUp, Waves, Wind, type LucideIcon } from "lucide-react";
import type { EspecieId, FatorId } from "@/config/indice";

/** Cada peixe tem sua cor. O nome sempre acompanha, então a cor nunca é a única pista. */
export const COR_ESPECIE: Record<EspecieId, string> = {
  traira: "#b4cc62",
  jundia: "#d9b48a",
  carpaComum: "#f2a93b",
  carpaCapim: "#7fd67a",
  dourado: "#ffd166",
  catfish: "#9dbfd6",
  bass: "#5fcb95",
  tilapia: "#62d6d3",
};

export const corDaEspecie = (id: string) => COR_ESPECIE[id as EspecieId] ?? "#c2c6b6";

export const COR_FATOR: Record<FatorId, string> = {
  agua: "#62d6d3",
  tendencia: "#ff9d62",
  pressao: "#c0a4ec",
  vento: "#86ccf0",
  chuva: "#7fb0ff",
  lua: "#ffe6a0",
  nuvens: "#cfd6de",
  rio: "#5fb8e8",
  represa: "#8fd1c4",
};

export const ICONE_FATOR: Record<FatorId, LucideIcon> = {
  agua: Thermometer,
  tendencia: TrendingUp,
  pressao: Gauge,
  vento: Wind,
  chuva: CloudRain,
  lua: Moon,
  nuvens: Cloud,
  rio: Waves,
  represa: Dam,
};

/** Verde quando o fator ajuda, âmbar quando fica no meio, terracota quando atrapalha. */
export function corDoFator(valor: number): string {
  if (valor >= 0.8) return "#a9dc4f";
  if (valor >= 0.5) return "#f2a93b";
  return "#ec7a5c";
}
