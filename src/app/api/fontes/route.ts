import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { statusDasFontes, ultimaPrecisao } from "@/lib/fontes/banco";
import { EPAGRI, INMET } from "@/lib/fontes/estacoes";
import { estadoDaFonte } from "@/lib/fontes/estado";
import { descomprimir } from "@/lib/fontes/guardar";
import { fontesBrutas } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

/** Situação de cada fonte, para a tela "Fontes". Com ?bruto=<fonte>, devolve a última resposta guardada, para auditoria. */
export async function GET(req: Request) {
  const bruto = new URL(req.url).searchParams.get("bruto");
  const db = getDb();
  if (bruto) {
    if (!db) return NextResponse.json({ erro: "Banco não configurado." }, { status: 503 });
    const [l] = await db
      .select()
      .from(fontesBrutas)
      .where(eq(fontesBrutas.fonte, bruto))
      .orderBy(desc(fontesBrutas.obtidoEm))
      .limit(1);
    if (!l) return NextResponse.json({ erro: "Nada guardado para essa fonte." }, { status: 404 });
    return new NextResponse(descomprimir(l.conteudo), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Obtido-Em": l.obtidoEm.toISOString() },
    });
  }

  const linhas = await statusDasFontes().catch(() => []);
  const agora = Date.now();
  const fontes = linhas.map((l) => ({ ...l, estado: estadoDaFonte(l, agora) }));
  const desligadas = [
    !INMET.configurada() && { grupo: "INMET", nome: "INMET · estações automáticas", motivo: "Falta o token (variável INMET_TOKEN na Vercel)." },
    !EPAGRI.configurada() && { grupo: "Epagri/Ciram", nome: "Epagri/Ciram · estações", motivo: "Conector pronto, aguardando acesso aos dados." },
  ].filter(Boolean);
  const precisao = await ultimaPrecisao();
  return NextResponse.json(
    { banco: Boolean(db), fontes, desligadas, ultimaRotina: precisao?.calculadoEm ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
