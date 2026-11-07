import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/entrar/route";
import { COOKIE_ACESSO, tokenDoCodigo } from "@/lib/acesso";
import { proxy } from "@/proxy";

const pedir = (caminho: string, cookie?: string) =>
  new NextRequest(`https://idfish.test${caminho}`, cookie ? { headers: { cookie: `${COOKIE_ACESSO}=${cookie}` } } : undefined);

const entrar = (codigo: unknown) =>
  POST(new Request("https://idfish.test/api/entrar", { method: "POST", body: JSON.stringify({ codigo }) }));

const seguiu = (r: Response) => r.headers.get("x-middleware-next") === "1";

afterEach(() => vi.unstubAllEnvs());

describe("portão do site", () => {
  it("sem cookie: página vai para /entrar e API responde 401", async () => {
    vi.stubEnv("CODIGO_ACESSO", "traira 42");
    const pagina = await proxy(pedir("/"));
    expect(pagina.status).toBe(307);
    expect(pagina.headers.get("location")).toBe("https://idfish.test/entrar");
    for (const rota of ["/api/indice", "/api/saidas", "/api/locais", "/registrar", "/historico"]) {
      expect(seguiu(await proxy(pedir(rota)))).toBe(false);
    }
    expect((await proxy(pedir("/api/saidas"))).status).toBe(401);
  });

  it("cookie errado não entra", async () => {
    vi.stubEnv("CODIGO_ACESSO", "traira 42");
    expect((await proxy(pedir("/api/indice", "chute"))).status).toBe(401);
  });

  it("cookie certo entra, e /entrar manda para o início", async () => {
    vi.stubEnv("CODIGO_ACESSO", "traira 42");
    const token = await tokenDoCodigo("traira 42");
    expect(seguiu(await proxy(pedir("/", token)))).toBe(true);
    expect(seguiu(await proxy(pedir("/api/saidas", token)))).toBe(true);
    expect((await proxy(pedir("/entrar", token))).headers.get("location")).toBe("https://idfish.test/");
  });

  it("trocar o código derruba o cookie antigo", async () => {
    vi.stubEnv("CODIGO_ACESSO", "novo codigo");
    const antigo = await tokenDoCodigo("traira 42");
    expect((await proxy(pedir("/api/indice", antigo))).status).toBe(401);
  });

  it("a tela de entrada, o cron e a arte abrem sem código", async () => {
    vi.stubEnv("CODIGO_ACESSO", "traira 42");
    for (const rota of ["/entrar", "/api/entrar", "/api/cron/previsoes", "/logo-completo.png", "/icons/icon-192.png", "/sw.js", "/manifest.webmanifest"]) {
      expect(seguiu(await proxy(pedir(rota)))).toBe(true);
    }
  });

  it("em produção sem código definido, tudo fica trancado", async () => {
    vi.stubEnv("CODIGO_ACESSO", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await proxy(pedir("/"))).status).toBe(307);
    expect((await proxy(pedir("/api/saidas", "qualquer"))).status).toBe(401);
  });

  it("em desenvolvimento sem código definido, fica aberto", async () => {
    vi.stubEnv("CODIGO_ACESSO", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(seguiu(await proxy(pedir("/")))).toBe(true);
  });
});

describe("POST /api/entrar", () => {
  it("código certo, com maiúsculas e espaços, recebe o cookie", async () => {
    vi.stubEnv("CODIGO_ACESSO", "traira 42");
    const r = await entrar("  TRAIRA 42 ");
    expect(r.status).toBe(200);
    const cookie = r.headers.get("set-cookie")!;
    expect(cookie).toContain(`${COOKIE_ACESSO}=${await tokenDoCodigo("traira 42")}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("traira");
  });

  it("código errado ou vazio não recebe cookie", async () => {
    vi.stubEnv("CODIGO_ACESSO", "traira 42");
    for (const tentativa of ["errado", "", "   ", 42, null]) {
      const r = await entrar(tentativa);
      expect(r.status).toBe(401);
      expect(r.headers.get("set-cookie")).toBeNull();
    }
  });

  it("sem código definido, ninguém entra", async () => {
    vi.stubEnv("CODIGO_ACESSO", "");
    expect((await entrar("")).status).toBe(503);
  });
});
