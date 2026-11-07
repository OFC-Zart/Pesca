/**
 * Todos os pesos e parâmetros do índice ficam neste arquivo.
 * Fonte: "Índice de Pesca – Cerro Negro (SC): como calcular a pontuação", seções 3, 4, 11 e 14.
 * Os valores marcados com AJUSTE são decisões para casos que o documento não define.
 */

export const PESOS = {
  agua: 0.35,
  tendencia: 0.1,
  pressao: 0.15,
  vento: 0.1,
  chuva: 0.1,
  lua: 0.1,
  nuvens: 0.1,
} as const;

export type FatorId = keyof typeof PESOS;

export type TipoAgua = "rio" | "acude" | "represa" | "rio_truta";
export type Periodo = "diurno" | "noturno" | "crepuscular" | "misto";

export interface Especie {
  nome: string;
  origem: "Nativa" | "Exótica";
  min: number;
  otMin: number;
  otMax: number;
  max: number;
  periodo: Periodo;
  /** Nota da chuva quando passa de 30 mm em 48 h. */
  chuvaForte: number;
  /** Nota das nuvens com menos de 40% de cobertura. */
  ceuLimpo: number;
}

export const ESPECIES = {
  traira: { nome: "Traíra", origem: "Nativa", min: 14, otMin: 22, otMax: 28, max: 33, periodo: "crepuscular", chuvaForte: 0.3, ceuLimpo: 0.6 },
  jundia: { nome: "Jundiá", origem: "Nativa", min: 10, otMin: 20, otMax: 26, max: 31, periodo: "noturno", chuvaForte: 0.8, ceuLimpo: 0.6 },
  carpaComum: { nome: "Carpa comum", origem: "Exótica", min: 12, otMin: 20, otMax: 26, max: 32, periodo: "misto", chuvaForte: 0.6, ceuLimpo: 0.7 },
  carpaCapim: { nome: "Carpa capim", origem: "Exótica", min: 8, otMin: 20, otMax: 29, max: 34, periodo: "diurno", chuvaForte: 0.5, ceuLimpo: 0.9 },
  dourado: { nome: "Dourado", origem: "Nativa", min: 14, otMin: 22, otMax: 28, max: 32, periodo: "diurno", chuvaForte: 0.2, ceuLimpo: 0.7 },
  catfish: { nome: "Catfish", origem: "Exótica", min: 10, otMin: 24, otMax: 29, max: 33, periodo: "noturno", chuvaForte: 0.8, ceuLimpo: 0.6 },
  bass: { nome: "Black bass", origem: "Exótica", min: 12, otMin: 20, otMax: 25, max: 30, periodo: "crepuscular", chuvaForte: 0.2, ceuLimpo: 0.6 },
  tilapia: { nome: "Tilápia", origem: "Exótica", min: 18, otMin: 26, otMax: 30, max: 34, periodo: "diurno", chuvaForte: 0.5, ceuLimpo: 1.0 },
} as const satisfies Record<string, Especie>;

export type EspecieId = keyof typeof ESPECIES;
export const ESPECIE_IDS = Object.keys(ESPECIES) as EspecieId[];

/** Espécies aceitas no diário, além das oito com nota. */
export const OUTRAS_CAPTURAS = ["Lambari", "Cará", "Truta arco-íris", "Outra"] as const;

export const LEGENDA_PERIODO: Record<Periodo, string> = {
  diurno: "Morde de dia",
  noturno: "Morde à noite",
  crepuscular: "Amanhecer e entardecer",
  misto: "O dia todo",
};

/** Locais iniciais. Açude e represa usam o centro até você cadastrar as coordenadas reais. */
export const LOCAIS_PADRAO = [
  { id: "centro-cerro-negro", nome: "Rio · Centro de Cerro Negro", tipo: "rio", lat: -27.8, lon: -50.88 },
  { id: "acude-cerro-negro", nome: "Açude · região de Cerro Negro", tipo: "acude", lat: -27.8, lon: -50.88 },
  { id: "represa-cerro-negro", nome: "Represa · clima de Cerro Negro", tipo: "represa", lat: -27.8, lon: -50.88 },
] as const satisfies readonly { id: string; nome: string; tipo: TipoAgua; lat: number; lon: number }[];

export const NOME_TIPO_AGUA: Record<TipoAgua, string> = {
  rio: "Rio",
  acude: "Açude",
  represa: "Represa",
  rio_truta: "Rio de truta",
};

/** Dias de ar usados na estimativa da água, por tipo. */
export const AGUA = {
  rio: { dias: 3, a: 0, b: 1 },
  acude: { dias: 7, a: 1, b: 1 },
  represa: { dias: 7, a: 1, b: 1 },
  rio_truta: { dias: 3, a: 3, b: 0.7 },
} as const satisfies Record<TipoAgua, { dias: number; a: number; b: number }>;

/** A cópia diária das previsões só mede a confiança do tempo: depois disso, ela é apagada. */
export const DIAS_GUARDAR_PREVISOES = 90;

/** Medições de termômetro necessárias para trocar a estimativa pela regressão do local. */
export const MEDICOES_PARA_CALIBRAR = 10;

/** AJUSTE: até esta variação em 48 h a água é considerada estável (°C). */
export const AGUA_ESTAVEL_DELTA = 0.5;

export const SEGURANCA = { ventoMax: 12, tempestadeDe: 95, tempestadeAte: 99 } as const;

export const ESCALA = [
  { ate: 30, nome: "Fraco", peixes: 1 },
  { ate: 50, nome: "Regular", peixes: 2 },
  { ate: 70, nome: "Bom", peixes: 3 },
  { ate: 85, nome: "Muito bom", peixes: 4 },
  { ate: 100, nome: "Excelente", peixes: 5 },
] as const;

export const JANELA = {
  sol: 1,
  solunarMaior: 0.8,
  solunarMenor: 0.6,
  resto: 0.3,
  noturno: 0.9,
  diurnoDe: 7,
  diurnoAte: 17,
  noturnoDe: 19,
  noturnoAte: 5,
} as const;

export const FASES = { completaAte: 2, faixaAte: 6 } as const;

/** Tabela de reserva: [dias à frente, % de confiança]. */
export const CONFIANCA_TABELA: readonly (readonly [number, number])[] = [
  [0, 95], [1, 90], [3, 80], [5, 70], [7, 60], [10, 45], [15, 30],
];

/** Largura da faixa p10–p90 em pontos para cada nível de confiança. */
export const CONFIANCA_FAIXA = { alta: 10, media: 20 } as const;

/** AJUSTE: como a tabela de reserva vira nível e faixa quando o ensemble falha. */
export const CONFIANCA_RESERVA = { alta: 80, media: 60, pontosPorPct: 0.25 } as const;

export const PIRACEMA = {
  inicio: { mes: 10, dia: 1 },
  fim: { mes: 1, dia: 31 },
  bacia: "bacia do Rio Uruguai",
  regras: [
    "Uma linha de mão ou uma vara por pescador",
    "Sem molinete, carretilha, redes, tarrafas ou espinhéis",
    "Sem barco a motor",
    "Nada a menos de 1.500 m de cachoeiras, corredeiras e barragens",
    "Limite de 5 kg + 1 exemplar",
    "Sem competições de pesca",
  ],
  pesquePague: "Pesque-pagues e pisciculturas registradas podem funcionar, comprovando a origem do peixe.",
  aviso: "Confirme as regras atuais com a Polícia Militar Ambiental.",
} as const;

export const AVISO_DOURADO =
  "Espécie protegida em várias regiões – prefira pesque e solte e confirme as regras com a Polícia Ambiental.";
