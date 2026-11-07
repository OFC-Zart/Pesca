import { NextResponse, type NextRequest } from "next/server";
import { urlDoBanco } from "@/lib/db/url";
import { COOKIE_SESSAO, lerTokenSessao } from "@/lib/sessao";

/** O que precisa abrir sem login: a entrada, o cadastro, o cron (tem segredo próprio) e a arte dessas telas. */
const ABERTAS = new Set([
  "/entrar",
  "/api/entrar",
  "/api/cadastro",
  "/api/cron/previsoes",
  "/manifest.webmanifest",
  "/sw.js",
  "/topo.svg",
  "/logo-completo.png",
  "/logo-nome.png",
  "/logo-simbolo.png",
]);

const ehAberta = (caminho: string) => ABERTAS.has(caminho) || caminho.startsWith("/icons/") || caminho.startsWith("/peixes/");

export async function proxy(req: NextRequest) {
  const caminho = req.nextUrl.pathname;

  // Sem banco não há contas: só o ambiente de desenvolvimento fica aberto. Em produção, o site fica trancado.
  if (!urlDoBanco() && process.env.NODE_ENV !== "production") return NextResponse.next();

  const logado = Boolean(await lerTokenSessao(req.cookies.get(COOKIE_SESSAO)?.value));

  if (caminho === "/entrar" && logado) return NextResponse.redirect(new URL("/", req.url));
  if (logado || ehAberta(caminho)) return NextResponse.next();

  if (caminho.startsWith("/api/")) {
    return NextResponse.json({ erro: "Entre com seu usuário e senha." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/entrar", req.url));
}

export const config = {
  matcher: "/((?!_next/static|_next/image).*)",
};
