import type { NextResponse } from "next/server";

/** Sessão sem tabela: um cookie assinado com "id.validade.assinatura". O proxy confere sem ir ao banco. */
export const COOKIE_SESSAO = "idfish_sessao";
export const SESSAO_DURACAO_SEG = 365 * 24 * 3600;

const codificador = new TextEncoder();

function paraBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binario = atob(texto.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binario, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * A chave vem da URL do banco: só o servidor conhece e dispensa mais uma variável na Vercel.
 * Se a senha do banco mudar, todo mundo só precisa entrar de novo.
 */
async function chave(): Promise<CryptoKey | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return crypto.subtle.importKey("raw", codificador.encode(`idfish-sessao:${url}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function criarTokenSessao(uid: number, agoraMs = Date.now()): Promise<string> {
  const k = await chave();
  if (!k) throw new Error("Banco não configurado");
  const validade = Math.floor(agoraMs / 1000) + SESSAO_DURACAO_SEG;
  const corpo = `${uid}.${validade}`;
  return `${corpo}.${paraBase64Url(await crypto.subtle.sign("HMAC", k, codificador.encode(corpo)))}`;
}

export async function lerTokenSessao(token: string | undefined | null, agoraMs = Date.now()): Promise<{ uid: number } | null> {
  if (!token) return null;
  const k = await chave();
  if (!k) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [uid, validade, assinatura] = partes;
  const bytes = deBase64Url(assinatura);
  if (!bytes) return null;
  if (!(await crypto.subtle.verify("HMAC", k, bytes, codificador.encode(`${uid}.${validade}`)))) return null;
  if (Number(validade) * 1000 <= agoraMs) return null;
  const id = Number(uid);
  return Number.isInteger(id) && id > 0 ? { uid: id } : null;
}

export async function sessaoDaRequisicao(req: Request): Promise<{ uid: number } | null> {
  const par = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE_SESSAO}=`));
  return lerTokenSessao(par?.slice(COOKIE_SESSAO.length + 1));
}

export async function iniciarSessao(resposta: NextResponse, uid: number): Promise<NextResponse> {
  resposta.cookies.set(COOKIE_SESSAO, await criarTokenSessao(uid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSAO_DURACAO_SEG,
  });
  return resposta;
}
