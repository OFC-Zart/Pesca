import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { criarLocal, listarLocais } from "@/lib/db/consultas";
import { esquemaLocal } from "@/lib/esquemas";

const hash = (s: string) => createHash("sha256").update(s).digest();

function chaveValida(enviada: string | null): boolean {
  const certa = process.env.ADMIN_KEY;
  if (!certa || !enviada) return false;
  return timingSafeEqual(hash(enviada), hash(certa));
}

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
    podeCadastrar: Boolean(getDb() && process.env.ADMIN_KEY),
  });
}

export async function POST(req: Request) {
  if (!getDb()) return NextResponse.json({ erro: "Banco não configurado." }, { status: 503 });
  if (!chaveValida(req.headers.get("x-admin-key"))) {
    return NextResponse.json({ erro: "Chave de administrador incorreta." }, { status: 401 });
  }
  const parsed = esquemaLocal.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const local = { id: criarSlug(parsed.data.nome), ...parsed.data };
  await criarLocal(local);
  return NextResponse.json(local, { status: 201 });
}
