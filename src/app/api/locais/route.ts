import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { criarLocal, editarLocal, listarLocais } from "@/lib/db/consultas";
import { esquemaEdicaoLocal, esquemaLocal } from "@/lib/esquemas";

function criarSlug(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "local"}-${Date.now().toString(36)}`;
}

export async function GET() {
  return NextResponse.json({
    locais: await listarLocais(),
    podeCadastrar: Boolean(getDb()),
  });
}

export async function POST(req: Request) {
  if (!getDb()) return NextResponse.json({ erro: "Banco não configurado." }, { status: 503 });
  const parsed = esquemaLocal.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const local = { id: criarSlug(parsed.data.nome), ...parsed.data };
  await criarLocal(local);
  return NextResponse.json(local, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!getDb()) return NextResponse.json({ erro: "Banco não configurado." }, { status: 503 });
  const parsed = esquemaEdicaoLocal.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const { id, ...dados } = parsed.data;
  const l = await editarLocal(id, dados);
  if (!l) return NextResponse.json({ erro: "Local não encontrado." }, { status: 404 });
  return NextResponse.json(l);
}
