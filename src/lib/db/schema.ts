import { date, integer, jsonb, pgTable, real, serial, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const locais = pgTable("locais", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  // Regressão Tágua = a + b × média do ar, recalculada a cada medição nova.
  calibA: real("calib_a"),
  calibB: real("calib_b"),
  calibN: integer("calib_n"),
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
  // Média do ar no dia da medição; é o "x" da regressão.
  mediaAr: real("media_ar"),
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
