import { NextResponse } from "next/server";
import { codigoConfere } from "@/lib/acesso";
import { getDb } from "@/lib/db";
import { criarUsuario } from "@/lib/db/consultas";
import { esquemaCadastro } from "@/lib/esquemas";
import { gerarHashSenha } from "@/lib/senha";
import { iniciarSessao } from "@/lib/sessao";

const ESPERA_ERRO_MS = 600;

export async function POST(req: Request) {
  if (!getDb()) {
    return NextResponse.json({ erro: "O banco de dados ainda não foi ligado na Vercel." }, { status: 503 });
  }
  const certo = process.env.CODIGO_ACESSO;
  if (!certo) {
    return NextResponse.json({ erro: "O código do grupo ainda não foi definido na Vercel." }, { status: 503 });
  }

  const parsed = esquemaCadastro.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Confira os campos." }, { status: 400 });
  }
  const { codigo, senha, ...dados } = parsed.data;

  // O código vem antes de olhar os usuários: quem não tem o código não descobre quem já existe.
  if (!codigoConfere(codigo, certo)) {
    await new Promise((r) => setTimeout(r, ESPERA_ERRO_MS));
    return NextResponse.json({ erro: "Código do grupo errado. Confira com quem te passou o link." }, { status: 401 });
  }

  const novo = await criarUsuario({ ...dados, senhaHash: await gerarHashSenha(senha) });
  if (!novo) {
    return NextResponse.json({ erro: "Esse usuário já existe. Escolha outro." }, { status: 409 });
  }
  return iniciarSessao(NextResponse.json({ ok: true }, { status: 201 }), novo.id);
}
