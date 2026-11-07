import { describe, expect, it } from "vitest";
import { urlDoBanco } from "@/lib/db/url";

const URL = "postgresql://usuario:senha@ep-x-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const DIRETA = "postgresql://usuario:senha@ep-x.sa-east-1.aws.neon.tech/neondb?sslmode=require";

describe("urlDoBanco", () => {
  it("usa DATABASE_URL quando existe", () => {
    expect(urlDoBanco({ DATABASE_URL: URL, OUTRA: DIRETA })).toBe(URL);
  });

  it("acha a variável com prefixo da integração", () => {
    expect(urlDoBanco({ PESCA_DB_DATABASE_URL: URL, PESCA_DB_DATABASE_URL_UNPOOLED: DIRETA, PESCA_DB_PGHOST: "ep-x" })).toBe(URL);
    expect(urlDoBanco({ PESCA_DB_POSTGRES_URL: URL })).toBe(URL);
  });

  it("acha mesmo com um nome inventado", () => {
    expect(urlDoBanco({ PESCA_DB: URL, NODE_ENV: "production" })).toBe(URL);
  });

  it("prefere a URL principal à sem pool, seja qual for a ordem", () => {
    expect(urlDoBanco({ A_POSTGRES_URL_NON_POOLING: DIRETA, B_POSTGRES_PRISMA_URL: DIRETA, Z_DATABASE_URL: URL })).toBe(URL);
  });

  it("limpa o que vem colado junto", () => {
    expect(urlDoBanco({ DATABASE_URL: `psql '${URL}'` })).toBe(URL);
    expect(urlDoBanco({ DATABASE_URL: `"${URL}"` })).toBe(URL);
    expect(urlDoBanco({ DATABASE_URL: `DATABASE_URL=${URL}\n` })).toBe(URL);
    expect(urlDoBanco({ DATABASE_URL: `  ${URL}  ` })).toBe(URL);
  });

  it("devolve null sem banco, inclusive com valor vazio ou que não é URL", () => {
    expect(urlDoBanco({})).toBeNull();
    expect(urlDoBanco({ DATABASE_URL: "", NODE_ENV: "production" })).toBeNull();
    expect(urlDoBanco({ DATABASE_URL: "colar-aqui", SITE_URL: "https://idfish.vercel.app" })).toBeNull();
  });
});
