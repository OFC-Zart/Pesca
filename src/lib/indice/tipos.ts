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
  /** Estação da ANA que mede o nível deste rio. Vazio: a mais perto. */
  estacao?: string | null;
  /** Represa de usina deste local. Vazio: a mais perto. */
  represa?: string | null;
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

/** De onde veio um número: medido numa estação, previsto pelos modelos ou estimado pelo Open-Meteo. */
export interface Origem {
  /** Como é hoje: até agora pode ser medido, e daqui para a frente é previsto. */
  tipo: "observado" | "previsto" | "estimado" | "misto";
  /** Frase para o dia de hoje. */
  hoje: string;
  /** Frase para os próximos dias. */
  depois: string;
}

/** O que a ANA e o ONS mostram para o local agora. */
export interface NivelAgua {
  /** Rio: variação em 24 h, em cm. Represa: variação em 7 dias, em m. */
  variacao: number;
  /** Nível atual: cm no rio, metros acima do mar na represa. */
  atual: number;
  /** Só na represa: % do volume útil, quando o ONS informa. */
  volume?: number | null;
  medidoEm: string;
  fonte: string;
}

/** Quanto os modelos discordam num dia: diferença entre o maior e o menor de cada um. */
export interface Discordancia {
  modelos: number;
  temp: number;
  chuva: number;
  vento: number;
  pressao: number;
}

export interface ResumoModelo {
  id: string;
  nome: string;
  temp: number | null;
  chuva: number | null;
  vento: number | null;
  pressao: number | null;
  nuvens: number | null;
  peso: number | null;
}

/** Informações das fontes que acompanham a previsão. */
export interface InfoFontes {
  /** Quantos modelos entraram na média. Zero: só o clima principal. */
  modelos: number;
  pesos: "precisao" | "iguais";
  correcaoVies: boolean;
  origens: Partial<Record<"temp" | "chuva" | "pressao" | "vento" | "nuvens" | "rio" | "represa", Origem>>;
  rio: NivelAgua | null;
  represa: NivelAgua | null;
  /** Fontes que falharam ou estão atrasadas, em texto curto para o aviso discreto. */
  avisos: string[];
  /** Previsão de cada modelo para hoje no local, para a tela de fontes. */
  hoje: ResumoModelo[];
}
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
  /** Só quando há modelos: o quanto eles discordaram neste dia. */
  discordancia: Discordancia | null;
  especies: Record<EspecieId, NotaEspecie>;
}

export interface Previsao {
  local: Local;
  locais: Local[];
  atualizadoEm: string;
  fonteConfianca: "ensemble" | "tabela";
  versaoModelo: number;
  dias: DiaPrevisao[];
  fontes: InfoFontes;
}
