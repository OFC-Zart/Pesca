import { NextResponse } from "next/server";
import { ESPECIE_IDS } from "@/config/indice";
import { getDb } from "@/lib/db";
import { listarLocais } from "@/lib/db/consultas";
import { previsoes } from "@/lib/db/schema";
import { gerarPrevisao, hojeEmSaoPaulo } from "@/lib/indice/previsao";

/** Grava a previsão do dia para comparar depois com o que aconteceu. A Vercel chama uma vez por dia. */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const db = getDb();
  if (!db) return NextResponse.json({ ok: true, ignorado: "Banco não configurado." });

  const hoje = hojeEmSaoPaulo();
  const locais = await listarLocais();
  let linhas = 0;
  for (const local of locais) {
    const p = await gerarPrevisao(local, locais);
    const valores = p.dias
      .filter((d) => d.fase !== "tendencia")
      .flatMap((d) =>
        ESPECIE_IDS.map((id) => ({
          dataAlvo: d.data,
          criadoEm: hoje,
          localId: local.id,
          especie: id,
          nota: d.especies[id].nota,
          faixaMin: d.especies[id].min,
          faixaMax: d.especies[id].max,
          fatores: d.especies[id].fatores,
        })),
      );
    await db.insert(previsoes).values(valores).onConflictDoNothing();
    linhas += valores.length;
  }
  return NextResponse.json({ ok: true, linhas });
}
