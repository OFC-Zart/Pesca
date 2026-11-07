import { NextResponse } from "next/server";
import { ultimaPrecisao } from "@/lib/fontes/banco";
import { tokenInmet } from "@/lib/fontes/estacoes";

/** O resumo mais recente da conferência dos modelos: erro por antecedência, pesos e viés. */
export async function GET() {
  const resumo = await ultimaPrecisao();
  return NextResponse.json({ resumo, inmet: Boolean(tokenInmet()) }, { headers: { "Cache-Control": "no-store" } });
}
