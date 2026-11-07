import { NextResponse } from "next/server";
import { atualizarPerfil, buscarUsuarioPorId } from "@/lib/db/consultas";
import { esquemaPerfil } from "@/lib/esquemas";
import { sessaoDaRequisicao } from "@/lib/sessao";

const SEM_LOGIN = () => NextResponse.json({ erro: "Entre com seu usuário e senha." }, { status: 401 });

export async function GET(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return SEM_LOGIN();
  const u = await buscarUsuarioPorId(sessao.uid);
  if (!u) return SEM_LOGIN();
  return NextResponse.json({ usuario: u.usuario, nome: u.nome, icone: u.icone }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return SEM_LOGIN();
  const parsed = esquemaPerfil.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Confira os campos." }, { status: 400 });
  }
  const u = await atualizarPerfil(sessao.uid, parsed.data);
  if (!u) return SEM_LOGIN();
  return NextResponse.json({ usuario: u.usuario, nome: u.nome, icone: u.icone });
}
