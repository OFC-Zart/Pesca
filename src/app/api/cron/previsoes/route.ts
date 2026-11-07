import { NextResponse } from "next/server";
import { ESPECIE_IDS } from "@/config/indice";
import { getDb } from "@/lib/db";
import { limparPrevisoesAntigas, listarLocais } from "@/lib/db/consultas";
import { previsoes } from "@/lib/db/schema";
import { ultimaPrecisao } from "@/lib/fontes/banco";
import { rodarRotina } from "@/lib/fontes/rotina";
import { gerarPrevisao, hojeEmSaoPaulo } from "@/lib/indice/previsao";
import { sessaoDaRequisicao } from "@/lib/sessao";

// A primeira rodada busca 60 dias de histórico dos modelos: pode passar de um minuto.
export const maxDuration = 300;

/**
 * Quem pode rodar: o cron da Vercel (com CRON_SECRET, ou pelo agente "vercel-cron" se o segredo não foi criado)
 * e qualquer pessoa logada, pelo botão da tela de precisão. Repetir não duplica nada, e há um intervalo mínimo.
 */
async function autorizado(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.get("authorization") === `Bearer ${segredo}`) return true;
  if (!segredo && /vercel-cron/i.test(req.headers.get("user-agent") ?? "")) return true;
  return Boolean(await sessaoDaRequisicao(req));
}

const INTERVALO_MINIMO_MS = 20 * 60_000;

async function rodar(req: Request) {
  if (!(await autorizado(req))) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ ok: true, ignorado: "Banco não configurado." });

  const ultima = await ultimaPrecisao();
  if (ultima && Date.now() - Date.parse(ultima.calculadoEm) < INTERVALO_MINIMO_MS) {
    return NextResponse.json({ ok: true, recente: true, calculadoEm: ultima.calculadoEm });
  }

  const relatorio = await rodarRotina();

  // A cópia diária da nota de cada local, para comparar depois com as pescarias.
  const hoje = hojeEmSaoPaulo();
  const locais = await listarLocais();
  let linhas = 0;
  for (const local of locais) {
    try {
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
    } catch (err) {
      relatorio.etapas[`local:${local.id}`] = `falhou: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  const apagadas = await limparPrevisoesAntigas(hoje);
  return NextResponse.json({ ok: true, ...relatorio, linhas, apagadas });
}

export const GET = rodar;
export const POST = rodar;
