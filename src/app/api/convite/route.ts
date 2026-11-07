import { NextResponse } from "next/server";

/** Link de convite com o código do grupo. Só quem já entrou chega aqui: o proxy barra o resto. */
export async function GET(req: Request) {
  const codigo = process.env.CODIGO_ACESSO?.trim();
  if (!codigo) {
    return NextResponse.json({ erro: "O código do grupo ainda não foi definido na Vercel." }, { status: 503 });
  }
  const link = `${new URL(req.url).origin}/entrar?convite=${encodeURIComponent(codigo)}`;
  return NextResponse.json({ link }, { headers: { "Cache-Control": "no-store" } });
}
