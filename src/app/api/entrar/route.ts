import { NextResponse } from "next/server";
import { COOKIE_ACESSO, COOKIE_DURACAO_SEG, tokenDoCodigo } from "@/lib/acesso";

const ESPERA_ERRO_MS = 600;

export async function POST(req: Request) {
  const certo = process.env.CODIGO_ACESSO;
  if (!certo) {
    return NextResponse.json({ erro: "O código de acesso ainda não foi definido na Vercel." }, { status: 503 });
  }

  const corpo = await req.json().catch(() => null);
  const digitado = typeof corpo?.codigo === "string" ? corpo.codigo : "";
  const token = await tokenDoCodigo(certo);

  if (!digitado.trim() || (await tokenDoCodigo(digitado)) !== token) {
    // Atraso pequeno: atrapalha quem tenta adivinhar e ninguém da turma percebe.
    await new Promise((r) => setTimeout(r, ESPERA_ERRO_MS));
    return NextResponse.json({ erro: "Código errado. Confira com a turma." }, { status: 401 });
  }

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_ACESSO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_DURACAO_SEG,
  });
  return resposta;
}
