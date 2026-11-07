import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/sessao";

export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.delete(COOKIE_SESSAO);
  return resposta;
}
