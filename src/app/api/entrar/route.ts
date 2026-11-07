import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buscarUsuarioPorLogin } from "@/lib/db/consultas";
import { esquemaEntrar } from "@/lib/esquemas";
import { conferirSenha, gerarHashSenha } from "@/lib/senha";
import { iniciarSessao } from "@/lib/sessao";

const ESPERA_ERRO_MS = 600;
const ERRO = "Usuário ou senha errados.";

async function recusar() {
  // Atraso pequeno: atrapalha quem tenta adivinhar e ninguém do grupo percebe.
  await new Promise((r) => setTimeout(r, ESPERA_ERRO_MS));
  return NextResponse.json({ erro: ERRO }, { status: 401 });
}

export async function POST(req: Request) {
  if (!getDb()) {
    return NextResponse.json({ erro: "O banco de dados ainda não foi ligado na Vercel." }, { status: 503 });
  }
  const parsed = esquemaEntrar.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return recusar();

  const usuario = await buscarUsuarioPorLogin(parsed.data.usuario);
  if (!usuario) {
    // Mesmo trabalho de uma senha errada: a demora não revela quais usuários existem.
    await gerarHashSenha(parsed.data.senha);
    return recusar();
  }
  if (!(await conferirSenha(parsed.data.senha, usuario.senhaHash))) return recusar();

  return iniciarSessao(NextResponse.json({ ok: true }), usuario.id);
}
