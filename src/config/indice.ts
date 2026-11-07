/**
 * Todos os pesos e parâmetros do índice ficam neste arquivo.
 *
 * A nota é um produto, não uma soma: nota = 100 × apetite × horário × condições.
 * Assim, água fora da faixa derruba a nota sozinha, como acontece com o peixe de verdade.
 * Valores vindos de estudo estão citados. Os marcados como ESTIMATIVA vêm do hábito do peixe e devem ser
 * os primeiros a mudar quando houver pescarias registradas.
 */

/** Pesos das condições do momento. O que sobra para a lua é pouco porque os estudos mostram pouco efeito. */
export const PESOS = {
  tendencia: 0.3,
  vento: 0.2,
  chuva: 0.2,
  nuvens: 0.15,
  pressao: 0.1,
  lua: 0.05,
} as const;

export type CondicaoId = keyof typeof PESOS;
export type FatorId = CondicaoId | "agua";

/** Condições medianas pesam bastante: "Excelente" fica para o dia em que quase tudo ajuda. */
export const EXPOENTE_CONDICOES = 2;
/** Curva do apetite abaixo do ótimo: o metabolismo acelera mais do que em linha reta com o calor. */
export const EXPOENTE_APETITE = 1.3;
/** A nota do dia é a média das melhores horas: um dia vale pela janela boa que ele oferece. */
export const HORAS_DA_NOTA = 4;
/** Sobe a cada mudança na fórmula, para separar os registros de cada versão na hora de calibrar. */
export const VERSAO_MODELO = 2;

export type TipoAgua = "rio" | "acude" | "represa" | "rio_truta";
export type Periodo = "diurno" | "noturno" | "crepuscular" | "misto";

export interface Especie {
  nome: string;
  artigo: "a" | "o";
  origem: "Nativa" | "Exótica";
  min: number;
  otMin: number;
  otMax: number;
  max: number;
  periodo: Periodo;
  /** Quanto o peixe morde em cada luz, de 0 a 1. ESTIMATIVA pelo hábito de cada espécie. */
  luz: { dia: number; crepusculo: number; noite: number };
  /** Nota da chuva quando passa de 30 mm em 48 h. */
  chuvaForte: number;
  /** Nota das nuvens com menos de 40% de cobertura. */
  ceuLimpo: number;
}

/*
 * Faixas de água (°C): abaixo de min o peixe praticamente não come; entre otMin e otMax come no máximo.
 * Tilápia: Epagri (ideal 26–30; limitante abaixo de 20; inadequado abaixo de 12) e estudos em que para de comer abaixo de 16.
 * Carpa comum: Epagri (ideal 20–25; 25–30 aceitável; inadequado abaixo de 8 e acima de 32).
 * Jundiá: Epagri (ideal 24–28; 14–24 aceitável; inadequado abaixo de 10), mais o melhor crescimento a 23,7 °C (Piedras 2004).
 * Traíra: consumo menor a 14, 18 e 34 °C do que a 30 °C (população do Alto Paraná); captura sobe com a água (UFPel, R² = 0,85).
 * Carpa capim: consumo ótimo 20–28 °C (USFWS); come ativamente acima de 7–8 °C.
 * Black bass: come pouco abaixo de 10 °C (revisão em Water, 2023); pico entre 21 e 27 °C.
 * Catfish: crescimento ótimo 24–29 °C; praticamente para abaixo de 10 °C.
 * Dourado: alimentação cai abaixo de 18 °C (criação). Em açude, só existe se foi solto.
 */
export const ESPECIES = {
  traira: { nome: "Traíra", artigo: "a", origem: "Nativa", min: 11, otMin: 24, otMax: 30, max: 36, periodo: "crepuscular", luz: { dia: 0.35, crepusculo: 1, noite: 0.75 }, chuvaForte: 0.3, ceuLimpo: 0.6 },
  jundia: { nome: "Jundiá", artigo: "o", origem: "Nativa", min: 8, otMin: 20, otMax: 28, max: 33, periodo: "noturno", luz: { dia: 0.25, crepusculo: 0.8, noite: 1 }, chuvaForte: 0.8, ceuLimpo: 0.6 },
  carpaComum: { nome: "Carpa comum", artigo: "a", origem: "Exótica", min: 8, otMin: 20, otMax: 26, max: 32, periodo: "misto", luz: { dia: 0.6, crepusculo: 1, noite: 0.75 }, chuvaForte: 0.6, ceuLimpo: 0.7 },
  carpaCapim: { nome: "Carpa capim", artigo: "a", origem: "Exótica", min: 8, otMin: 20, otMax: 28, max: 34, periodo: "diurno", luz: { dia: 1, crepusculo: 0.8, noite: 0.25 }, chuvaForte: 0.5, ceuLimpo: 0.9 },
  dourado: { nome: "Dourado", artigo: "o", origem: "Nativa", min: 14, otMin: 22, otMax: 28, max: 32, periodo: "diurno", luz: { dia: 0.85, crepusculo: 1, noite: 0.15 }, chuvaForte: 0.2, ceuLimpo: 0.7 },
  catfish: { nome: "Catfish", artigo: "o", origem: "Exótica", min: 10, otMin: 24, otMax: 30, max: 34, periodo: "noturno", luz: { dia: 0.3, crepusculo: 0.85, noite: 1 }, chuvaForte: 0.8, ceuLimpo: 0.6 },
  bass: { nome: "Black bass", artigo: "o", origem: "Exótica", min: 8, otMin: 20, otMax: 27, max: 35, periodo: "crepuscular", luz: { dia: 0.45, crepusculo: 1, noite: 0.25 }, chuvaForte: 0.2, ceuLimpo: 0.6 },
  tilapia: { nome: "Tilápia", artigo: "a", origem: "Exótica", min: 16, otMin: 26, otMax: 30, max: 36, periodo: "diurno", luz: { dia: 1, crepusculo: 0.7, noite: 0.1 }, chuvaForte: 0.5, ceuLimpo: 1 },
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
  { id: "acude-cerro-negro", nome: "Açude · região de Cerro Negro", tipo: "acude", lat: -27.8, lon: -50.88 },
  { id: "centro-cerro-negro", nome: "Rio · Centro de Cerro Negro", tipo: "rio", lat: -27.8, lon: -50.88 },
  { id: "represa-cerro-negro", nome: "Represa · clima de Cerro Negro", tipo: "represa", lat: -27.8, lon: -50.88 },
] as const satisfies readonly { id: string; nome: string; tipo: TipoAgua; lat: number; lon: number }[];

export const NOME_TIPO_AGUA: Record<TipoAgua, string> = {
  rio: "Rio",
  acude: "Açude",
  represa: "Represa",
  rio_truta: "Rio de truta",
};

/*
 * Temperatura da água sem termômetro: a água corre atrás de um alvo (ar + calor do sol), mais devagar quanto mais funda.
 * Ajustado contra a água medida pela Epagri em Caçador (SC), 23/03 a 03/09/2009: 15,9 °C às 9 h e 16,9 °C às 15 h, com ar a 14,1 °C.
 * O mesmo ganho de sol dá cerca de +3 °C em época quente, como no açude de terra paulista (+3) e nos viveiros do Alabama (+3 a +4).
 */
/** Dias de inércia por metro de profundidade: ρ·c / K, com troca de calor K de 25 W/m²/°C. */
export const TAU_POR_METRO = 1.94;
/** A margem rasa esquenta e esfria bem mais rápido que o corpo do açude: é onde se vê a diferença entre manhã e tarde. */
export const MARGEM = { tau: 0.5, peso: 0.1 } as const;

export const AGUA: Record<TipoAgua, { profundidade?: number; tau?: number; beta: number; a?: number; b?: number }> = {
  acude: { profundidade: 2.5, beta: 0.014 },
  represa: { profundidade: 8, beta: 0.014 },
  // Rio corre e tem sombra: pega pouco sol e acompanha o ar de perto.
  rio: { tau: 1.5, beta: 0.006 },
  rio_truta: { tau: 1, beta: 0, a: 3, b: 0.7 },
};

/** A cópia diária das previsões só mede a confiança do tempo: depois disso, ela é apagada. */
export const DIAS_GUARDAR_PREVISOES = 90;

/**
 * Com poucas medições de termômetro só se corrige o desvio médio do local.
 * Com muitas, cobrindo uma boa faixa de temperatura, ajusta-se a reta inteira.
 */
export const MEDICOES_PARA_CALIBRAR = 3;
export const MEDICOES_PARA_RETA = 10;
export const FAIXA_PARA_RETA = 4;

export const SEGURANCA = { ventoMax: 12, tempestadeDe: 95, tempestadeAte: 99 } as const;

export const ESCALA = [
  { ate: 30, nome: "Fraco", peixes: 1 },
  { ate: 50, nome: "Regular", peixes: 2 },
  { ate: 70, nome: "Bom", peixes: 3 },
  { ate: 85, nome: "Muito bom", peixes: 4 },
  { ate: 100, nome: "Excelente", peixes: 5 },
] as const;

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
  "Espécie protegida em várias regiões – prefira pesque e solte e confirme as regras com a Polícia Ambiental. Em açude, o dourado só existe se foi solto.";
