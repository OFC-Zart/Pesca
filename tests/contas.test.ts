import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAIS_PADRAO } from "@/config/indice";
import * as schema from "@/lib/db/schema";
import { COOKIE_SESSAO, SESSAO_DURACAO_SEG, criarTokenSessao, lerTokenSessao } from "@/lib/sessao";
import { conferirSenha, gerarHashSenha } from "@/lib/senha";
import { proxy } from "@/proxy";

const pg = new PGlite();
const db = drizzle(pg, { schema });

vi.mock("@/lib/db", () => ({ getDb: () => db }));
// A pescaria é gravada mesmo sem clima: assim o teste não depende da internet.
vi.mock("@/lib/openmeteo", () => ({ buscarClima: () => Promise.reject(new Error("sem rede no teste")) }));

const { POST: cadastrar } = await import("@/app/api/cadastro/route");
const { POST: entrar } = await import("@/app/api/entrar/route");
const { POST: sair } = await import("@/app/api/sair/route");
const { GET: verPerfil, PATCH: mudarPerfil } = await import("@/app/api/perfil/route");
const { GET: verSaidas, POST: gravarSaida } = await import("@/app/api/saidas/route");

const URL_FALSA = "postgres://teste:segredo@banco.test/idfish";
const CODIGO = "traira do acude 77";

const corpo = (dados: unknown, cookie?: string) => ({
  method: "POST",
  body: JSON.stringify(dados),
  headers: cookie ? { cookie: `${COOKIE_SESSAO}=${cookie}` } : undefined,
});
const pedir = (caminho: string, dados: unknown, cookie?: string) => new Request(`https://idfish.test${caminho}`, corpo(dados, cookie));
const pagina = (caminho: string, cookie?: string) =>
  new NextRequest(`https://idfish.test${caminho}`, cookie ? { headers: { cookie: `${COOKIE_SESSAO}=${cookie}` } } : undefined);
const seguiu = (r: Response) => r.headers.get("x-middleware-next") === "1";

const conta = (extra = {}) => ({ nome: "Danilo", usuario: `u${randomUUID().slice(0, 8)}`, senha: "minhocuçu", icone: "tubarao-vaca", codigo: CODIGO, ...extra });

function tokenDoSetCookie(r: Response): string {
  const m = r.headers.get("set-cookie")?.match(new RegExp(`${COOKIE_SESSAO}=([^;]+)`));
  if (!m) throw new Error("sem cookie de sessão");
  return m[1];
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(schema.locais).values(LOCAIS_PADRAO.map((l) => ({ ...l })));
});

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", URL_FALSA);
  vi.stubEnv("CODIGO_ACESSO", CODIGO);
});
afterEach(() => vi.unstubAllEnvs());

describe("senha", () => {
  it("o hash confere só com a senha certa e muda a cada vez", async () => {
    const a = await gerarHashSenha("minhocuçu");
    const b = await gerarHashSenha("minhocuçu");
    expect(a).not.toBe(b);
    expect(a).not.toContain("minhocuçu");
    expect(await conferirSenha("minhocuçu", a)).toBe(true);
    expect(await conferirSenha("errada", a)).toBe(false);
    expect(await conferirSenha("minhocuçu", "lixo")).toBe(false);
  });
});

describe("sessão", () => {
  it("token válido devolve o usuário", async () => {
    expect(await lerTokenSessao(await criarTokenSessao(7))).toEqual({ uid: 7 });
  });
  it("trocar o id ou a assinatura invalida", async () => {
    const t = await criarTokenSessao(7);
    expect(await lerTokenSessao(t.replace(/^7\./, "8."))).toBeNull();
    expect(await lerTokenSessao(`${t.slice(0, -2)}xx`)).toBeNull();
    expect(await lerTokenSessao("chute")).toBeNull();
    expect(await lerTokenSessao("7.9999999999.!!!")).toBeNull();
  });
  it("expira depois de um ano", async () => {
    const agora = Date.now();
    const t = await criarTokenSessao(7, agora);
    expect(await lerTokenSessao(t, agora + (SESSAO_DURACAO_SEG - 60) * 1000)).toEqual({ uid: 7 });
    expect(await lerTokenSessao(t, agora + (SESSAO_DURACAO_SEG + 60) * 1000)).toBeNull();
  });
  it("assinado com outra chave não vale", async () => {
    const t = await criarTokenSessao(7);
    vi.stubEnv("DATABASE_URL", "postgres://outro/banco");
    expect(await lerTokenSessao(t)).toBeNull();
  });
});

describe("portão do site", () => {
  it("sem login: página vai para /entrar e API responde 401", async () => {
    const r = await proxy(pagina("/"));
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toBe("https://idfish.test/entrar");
    for (const rota of ["/registrar", "/historico", "/perfil", "/locais"]) expect((await proxy(pagina(rota))).status).toBe(307);
    for (const rota of ["/api/indice", "/api/saidas", "/api/locais", "/api/perfil", "/api/sair"]) expect((await proxy(pagina(rota))).status).toBe(401);
  });
  it("sessão falsa não entra", async () => {
    expect((await proxy(pagina("/api/saidas", "1.9999999999.falsa"))).status).toBe(401);
  });
  it("com login entra, e /entrar manda para o início", async () => {
    const t = await criarTokenSessao(1);
    expect(seguiu(await proxy(pagina("/", t)))).toBe(true);
    expect(seguiu(await proxy(pagina("/api/saidas", t)))).toBe(true);
    expect((await proxy(pagina("/entrar", t))).headers.get("location")).toBe("https://idfish.test/");
  });
  it("entrada, cadastro, cron e arte abrem sem login", async () => {
    for (const rota of ["/entrar", "/api/entrar", "/api/cadastro", "/api/cron/previsoes", "/logo-completo.png", "/peixes/tubarao-vaca.webp", "/icons/icon-192.png", "/sw.js", "/manifest.webmanifest"]) {
      expect(seguiu(await proxy(pagina(rota)))).toBe(true);
    }
  });
  it("em produção sem banco, tudo fica trancado", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await proxy(pagina("/"))).status).toBe(307);
    expect((await proxy(pagina("/api/saidas", "1.9999999999.falsa"))).status).toBe(401);
  });
  it("em desenvolvimento sem banco, fica aberto", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(seguiu(await proxy(pagina("/")))).toBe(true);
  });
});

describe("criar conta", () => {
  it("cria com o código certo, entra na hora e não guarda a senha", async () => {
    const c = conta({ usuario: "Danilo.Pesca", codigo: "  TRAIRA do Acude 77 " });
    const r = await cadastrar(pedir("/api/cadastro", c));
    expect(r.status).toBe(201);
    expect(r.headers.get("set-cookie")).toContain("HttpOnly");
    const sessao = await lerTokenSessao(tokenDoSetCookie(r));

    const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.usuario, "danilo.pesca"));
    expect(u.id).toBe(sessao?.uid);
    expect(u.nome).toBe("Danilo");
    expect(u.icone).toBe("tubarao-vaca");
    expect(u.senhaHash).not.toContain(c.senha);
  });

  it("código errado não cria nada", async () => {
    const c = conta({ codigo: "chute" });
    const r = await cadastrar(pedir("/api/cadastro", c));
    expect(r.status).toBe(401);
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(await db.select().from(schema.usuarios).where(eq(schema.usuarios.usuario, c.usuario))).toEqual([]);
  });

  it("usuário repetido é recusado, mesmo com maiúsculas", async () => {
    const c = conta();
    expect((await cadastrar(pedir("/api/cadastro", c))).status).toBe(201);
    expect((await cadastrar(pedir("/api/cadastro", { ...c, usuario: c.usuario.toUpperCase() }))).status).toBe(409);
  });

  it("recusa dados ruins", async () => {
    for (const ruim of [{ usuario: "ab" }, { usuario: "com espaco" }, { usuario: "joão" }, { senha: "123" }, { nome: "x" }, { icone: "gato" }, { icone: "../../segredo" }]) {
      expect((await cadastrar(pedir("/api/cadastro", conta(ruim)))).status).toBe(400);
    }
    expect((await cadastrar(pedir("/api/cadastro", null))).status).toBe(400);
  });

  it("sem código definido na Vercel, ninguém se cadastra", async () => {
    vi.stubEnv("CODIGO_ACESSO", "");
    expect((await cadastrar(pedir("/api/cadastro", conta()))).status).toBe(503);
  });
});

describe("entrar e sair", () => {
  it("usuário e senha certos entram, sem precisar do código", async () => {
    const c = conta();
    await cadastrar(pedir("/api/cadastro", c));
    vi.stubEnv("CODIGO_ACESSO", "codigo novo");
    const r = await entrar(pedir("/api/entrar", { usuario: `  ${c.usuario.toUpperCase()} `, senha: c.senha }));
    expect(r.status).toBe(200);
    expect(await lerTokenSessao(tokenDoSetCookie(r))).not.toBeNull();
  });

  it("senha errada e usuário inexistente dão a mesma resposta", async () => {
    const c = conta();
    await cadastrar(pedir("/api/cadastro", c));
    const a = await entrar(pedir("/api/entrar", { usuario: c.usuario, senha: "errada" }));
    const b = await entrar(pedir("/api/entrar", { usuario: "ninguem-aqui", senha: "errada" }));
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(await a.json()).toEqual(await b.json());
    expect(a.headers.get("set-cookie")).toBeNull();
  });

  it("corpo inválido não derruba o login", async () => {
    for (const ruim of [null, {}, { usuario: 1, senha: 2 }]) {
      expect((await entrar(pedir("/api/entrar", ruim))).status).toBe(401);
    }
  });

  it("sair apaga o cookie", async () => {
    const r = await sair();
    expect(r.status).toBe(200);
    expect(r.headers.get("set-cookie")).toMatch(new RegExp(`${COOKIE_SESSAO}=;|${COOKIE_SESSAO}=.*(Max-Age=0|Expires=Thu, 01 Jan 1970)`));
  });
});

describe("perfil", () => {
  it("mostra e muda nome e fotinha, sem expor a senha", async () => {
    const c = conta();
    const t = tokenDoSetCookie(await cadastrar(pedir("/api/cadastro", c)));

    const r = await verPerfil(new Request("https://idfish.test/api/perfil", { headers: { cookie: `outro=1; ${COOKIE_SESSAO}=${t}` } }));
    const p = await r.json();
    expect(p).toEqual({ usuario: c.usuario, nome: "Danilo", icone: "tubarao-vaca" });

    const m = await mudarPerfil(new Request("https://idfish.test/api/perfil", { method: "PATCH", body: JSON.stringify({ nome: "Dan", icone: "zerou-de-novo" }), headers: { cookie: `${COOKIE_SESSAO}=${t}` } }));
    expect(await m.json()).toEqual({ usuario: c.usuario, nome: "Dan", icone: "zerou-de-novo" });
  });

  it("não aceita fotinha fora da lista e exige login", async () => {
    const t = tokenDoSetCookie(await cadastrar(pedir("/api/cadastro", conta())));
    const m = await mudarPerfil(new Request("https://idfish.test/api/perfil", { method: "PATCH", body: JSON.stringify({ nome: "Dan", icone: "gato" }), headers: { cookie: `${COOKIE_SESSAO}=${t}` } }));
    expect(m.status).toBe(400);
    expect((await verPerfil(new Request("https://idfish.test/api/perfil"))).status).toBe(401);
  });

  it("sessão de usuário que não existe mais volta para o login", async () => {
    const t = await criarTokenSessao(999999);
    expect((await verPerfil(new Request("https://idfish.test/api/perfil", { headers: { cookie: `${COOKIE_SESSAO}=${t}` } }))).status).toBe(401);
  });
});

describe("pescarias da conta", () => {
  it("a saída fica ligada a quem está logado e o histórico mostra nome e fotinha", async () => {
    const t = tokenDoSetCookie(await cadastrar(pedir("/api/cadastro", conta({ nome: "Zé do Açude", icone: "olho-gordo" }))));
    const clienteId = randomUUID();
    const r = await gravarSaida(
      pedir(
        "/api/saidas",
        { clienteId, data: "2026-11-06", inicio: "06:00", fim: "09:00", localId: "centro-cerro-negro", especieAlvo: "traira", capturas: [{ especie: "traira", quantidade: 3 }] },
        t,
      ),
    );
    expect(r.status).toBe(201);

    const { saidas } = await (await verSaidas()).json();
    const s = saidas.find((x: { clienteId: string }) => x.clienteId === clienteId);
    expect(s.nome).toBe("Zé do Açude");
    expect(s.icone).toBe("olho-gordo");
    expect(s.capturas).toEqual([{ especie: "traira", quantidade: 3 }]);
    expect(JSON.stringify(saidas)).not.toContain("senha");
  });
});
