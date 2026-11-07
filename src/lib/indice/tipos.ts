import type { EspecieId, FatorId, TipoAgua } from "@/config/indice";

export interface Local {
  id: string;
  nome: string;
  tipo: TipoAgua;
  lat: number;
  lon: number;
  calibA?: number | null;
  calibB?: number | null;
  calibN?: number | null;
  /** Profundidade média em metros; quanto mais funda, mais devagar a água muda. */
  profundidade?: number | null;
}

/** Série horária do clima. `tempo` é a hora local em "YYYY-MM-DDTHH:mm". */
export interface SerieClima {
  tempo: string[];
  temp: (number | null)[];
  pressao: (number | null)[];
  vento: (number | null)[];
  chuva: (number | null)[];
  nuvens: (number | null)[];
  codigo: (number | null)[];
  /** Radiação solar em W/m². */
  sol: (number | null)[];
}

export interface DiaClima {
  data: string;
  temp: number;
  pressao: number;
  vento: number;
  ventoMax: number;
  chuva: number;
  nuvens: number;
  tempestade: boolean;
  horasInseguras: number[];
}

/** O clima de uma hora, já com a água estimada. */
export interface HoraClima {
  data: string;
  hora: number;
  tempAr: number;
  tempAgua: number;
  /** Saída do modelo antes da calibração do local: é ela que entra na regressão com o termômetro. */
  aguaModelo: number;
  deltaAgua48h: number;
  deltaPressao24h: number;
  vento: number;
  chuvaHora: number;
  chuva48h: number;
  nuvens: number;
}

export interface Astro {
  /** Horas locais em decimal (5,5 = 05:30). Null quando o evento não ocorre no dia. */
  nascerSol: number | null;
  porSol: number | null;
  nascerLua: number | null;
  porLua: number | null;
  luaAlta: number;
  luaBaixa: number;
  idadeLua: number;
  iluminacao: number;
  crescente: boolean;
}

export interface Brutos {
  tempAgua: number;
  deltaAgua48h: number;
  deltaPressao24h: number;
  vento: number;
  chuva48h: number;
  nuvens: number;
  tempAr: number;
}

export type Fatores = Record<FatorId, number>;
export type NivelConfianca = "alta" | "media" | "baixa";
export type Fase = "completa" | "faixa" | "tendencia";

export interface NotaEspecie {
  /** Null nos dias de tendência: só água e lua são mostradas. */
  nota: number | null;
  min: number | null;
  max: number | null;
  fatores: Fatores;
  horas: number[] | null;
  motivo: string;
  /** Quanto o horário favorece na melhor hora, de 0 a 1. */
  horario: number;
  /** O clima na melhor hora, de onde saíram os fatores. */
  base: Pick<HoraClima, "hora" | "tempAgua" | "deltaAgua48h" | "deltaPressao24h" | "vento" | "chuva48h" | "nuvens">;
}

export interface DiaPrevisao {
  data: string;
  fase: Fase;
  astro: Astro;
  brutos: Brutos;
  confianca: NivelConfianca;
  /** Bloqueio de segurança: vento acima do limite ou tempestade no dia. */
  bloqueio: string | null;
  horasInseguras: number[];
  especies: Record<EspecieId, NotaEspecie>;
}

export interface Previsao {
  local: Local;
  locais: Local[];
  atualizadoEm: string;
  fonteConfianca: "ensemble" | "tabela";
  versaoModelo: number;
  dias: DiaPrevisao[];
}
