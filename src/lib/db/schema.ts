import { date, integer, jsonb, pgTable, primaryKey, real, serial, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const locais = pgTable("locais", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  // Tágua = a + b × modelo, recalculada a cada medição nova de termômetro.
  calibA: real("calib_a"),
  calibB: real("calib_b"),
  calibN: integer("calib_n"),
  profundidade: real("profundidade"),
  // Estação da ANA do rio e represa de usina do local. Vazio: a mais perto.
  estacao: text("estacao"),
  represa: text("represa"),
});

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  // Sempre em minúsculas, para "Danilo" e "danilo" serem o mesmo login.
  usuario: text("usuario").notNull().unique(),
  nome: text("nome").notNull(),
  icone: text("icone").notNull(),
  senhaHash: text("senha_hash").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const saidas = pgTable("saidas", {
  id: serial("id").primaryKey(),
  // Gerado no aparelho: evita duplicar uma pescaria enviada de novo quando o sinal volta.
  clienteId: uuid("cliente_id").notNull().unique(),
  data: date("data").notNull(),
  inicio: text("inicio").notNull(),
  fim: text("fim").notNull(),
  localId: text("local_id").notNull().references(() => locais.id),
  especieAlvo: text("especie_alvo").notNull(),
  isca: text("isca"),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  apelido: text("apelido"),
  nota: integer("nota"),
  fatores: jsonb("fatores"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const capturas = pgTable("capturas", {
  id: serial("id").primaryKey(),
  saidaId: integer("saida_id").notNull().references(() => saidas.id, { onDelete: "cascade" }),
  especie: text("especie").notNull(),
  quantidade: integer("quantidade").notNull(),
  tamanhoCm: real("tamanho_cm"),
});

export const medicoesAgua = pgTable("medicoes_agua", {
  id: serial("id").primaryKey(),
  localId: text("local_id").notNull().references(() => locais.id),
  medidoEm: timestamp("medido_em", { withTimezone: true }).notNull().defaultNow(),
  temperatura: real("temperatura").notNull(),
  // Medições antigas, da fórmula anterior. Não entram mais na calibração.
  mediaAr: real("media_ar"),
  // O que o modelo estimava na hora da medição: é o "x" da calibração.
  aguaModelo: real("agua_modelo"),
});

export const previsoes = pgTable(
  "previsoes",
  {
    id: serial("id").primaryKey(),
    dataAlvo: date("data_alvo").notNull(),
    criadoEm: date("criado_em").notNull(),
    localId: text("local_id").notNull().references(() => locais.id),
    especie: text("especie").notNull(),
    nota: integer("nota"),
    faixaMin: integer("faixa_min"),
    faixaMax: integer("faixa_max"),
    fatores: jsonb("fatores"),
  },
  (t) => [unique("previsoes_unica").on(t.dataAlvo, t.criadoEm, t.localId, t.especie)],
);

/** O que cada modelo previu, por faixa de 6 horas, para conferir depois com o que aconteceu. */
export const previsoesModelos = pgTable(
  "previsoes_modelos",
  {
    id: serial("id").primaryKey(),
    ponto: text("ponto").notNull(),
    modelo: text("modelo").notNull(),
    variavel: text("variavel").notNull(),
    dataAlvo: date("data_alvo").notNull(),
    faixa: smallint("faixa").notNull(),
    antecedencia: smallint("antecedencia").notNull(),
    valor: real("valor").notNull(),
    criadoEm: date("criado_em").notNull(),
  },
  (t) => [unique("previsoes_modelos_unica").on(t.ponto, t.modelo, t.variavel, t.dataAlvo, t.faixa, t.antecedencia)],
);

/** O que aconteceu em cada ponto de conferência: medido (INMET) ou estimado (Open-Meteo), por faixa de 6 horas. */
export const observacoes = pgTable(
  "observacoes",
  {
    ponto: text("ponto").notNull(),
    variavel: text("variavel").notNull(),
    data: date("data").notNull(),
    faixa: smallint("faixa").notNull(),
    valor: real("valor").notNull(),
    origem: text("origem").notNull(),
  },
  (t) => [primaryKey({ columns: [t.ponto, t.variavel, t.data, t.faixa] })],
);

/** Resumo diário da precisão: erro de cada modelo, pesos e correção de viés em uso. */
export const precisao = pgTable("precisao", {
  data: date("data").primaryKey(),
  resumo: jsonb("resumo").notNull(),
});

/** Nível diário das represas de usina, do ONS (ou da ANA quando o ONS falha). */
export const niveisRepresa = pgTable(
  "niveis_represa",
  {
    represa: text("represa").notNull(),
    data: date("data").notNull(),
    nivel: real("nivel").notNull(),
    volume: real("volume"),
    origem: text("origem").notNull(),
  },
  (t) => [primaryKey({ columns: [t.represa, t.data] })],
);

/** Respostas brutas das fontes, comprimidas, para auditoria. Apagadas depois de 30 dias. */
export const fontesBrutas = pgTable(
  "fontes_brutas",
  {
    id: serial("id").primaryKey(),
    fonte: text("fonte").notNull(),
    obtidoEm: timestamp("obtido_em", { withTimezone: true }).notNull(),
    status: integer("status").notNull(),
    tipo: text("tipo"),
    tamanho: integer("tamanho").notNull(),
    // gzip em base64.
    conteudo: text("conteudo").notNull(),
  },
  (t) => [unique("fontes_brutas_unica").on(t.fonte, t.obtidoEm)],
);

/** Situação de cada fonte: última tentativa, último acerto e o erro, se houve. */
export const fontesStatus = pgTable("fontes_status", {
  fonte: text("fonte").primaryKey(),
  nome: text("nome").notNull(),
  grupo: text("grupo").notNull(),
  ultimaTentativa: timestamp("ultima_tentativa", { withTimezone: true }).notNull(),
  ultimoSucesso: timestamp("ultimo_sucesso", { withTimezone: true }),
  dadoDe: timestamp("dado_de", { withTimezone: true }),
  erro: text("erro"),
});
