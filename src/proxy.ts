import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACESSO, tokenDoCodigo } from "@/lib/acesso";

/** O que precisa abrir sem código: a própria entrada, o cron (tem segredo próprio) e a arte da tela de entrada. */
const ABERTAS = new Set([
  "/entrar",
  "/api/entrar",
  "/api/cron/previsoes",
  "/manifest.webmanifest",
  "/sw.js",
  "/topo.svg",
  "/logo-completo.png",
  "/logo-nome.png",
  "/logo-simbolo.png",
]);

const ehAberta = (caminho: string) => ABERTAS.has(caminho) || caminho.startsWith("/icons/");

export async function proxy(req: NextRequest) {
  const caminho = req.nextUrl.pathname;
  const codigo = process.env.CODIGO_ACESSO;

  // Sem código definido, só o ambiente de desenvolvimento fica aberto. Em produção, o site fica trancado.
  if (!codigo && process.env.NODE_ENV !== "production") return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_ACESSO)?.value;
  const liberado = Boolean(codigo && cookie && cookie === (await tokenDoCodigo(codigo)));

  if (caminho === "/entrar" && liberado) return NextResponse.redirect(new URL("/", req.url));
  if (liberado || ehAberta(caminho)) return NextResponse.next();

  if (caminho.startsWith("/api/")) {
    return NextResponse.json({ erro: "Precisa do código de acesso." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/entrar", req.url));
}

export const config = {
  matcher: "/((?!_next/static|_next/image).*)",
};
