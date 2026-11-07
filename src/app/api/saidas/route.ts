import { NextResponse } from "next/server";
import { ESPECIES, type EspecieId } from "@/config/indice";
import { getDb } from "@/lib/db";
import { gravarSaida, listarLocais, listarSaidas } from "@/lib/db/consultas";
import { esquemaSaida } from "@/lib/esquemas";
import { calcularAstro } from "@/lib/indice/astro";
import { agruparDias, calcularBrutos, calcularFatores, diasDaMedia, mediaAr, somarNota } from "@/lib/indice/calculo";
import { buscarClima } from "@/lib/openmeteo";

export async function GET() {
  try {
    const lista = await listarSaidas();
    return NextResponse.json({ configurado: lista !== null, saidas: lista ?? [] });
  } catch (err) {
    console.error("Falha ao listar saídas:", err);
    return NextResponse.json({ erro: "Banco indisponível." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!getDb()) return NextResponse.json({ erro: "Banco não configurado." }, { status: 503 });

  const corpo = await req.json().catch(() => null);
  const parsed = esquemaSaida.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const saida = parsed.data;

  const local = (await listarLocais()).find((l) => l.id === saida.localId);
  if (!local) return NextResponse.json({ erro: "Local desconhecido." }, { status: 400 });

  // Guarda o clima e a nota daquele dia para a calibração. Sem clima, a pescaria é gravada do mesmo jeito.
  let snapshot: { nota: number | null; fatores: unknown; mediaAr: number | null } = { nota: null, fatores: null, mediaAr: null };
  try {
    const { serie, offsetSeg } = await buscarClima(local.lat, local.lon);
    const dias = agruparDias(serie);
    const i = dias.findIndex((d) => d.data === saida.data);
    if (i !== -1) {
      const brutos = calcularBrutos(dias, i, local);
      const astro = calcularAstro(saida.data, local.lat, local.lon, offsetSeg);
      const especie = ESPECIES[saida.especieAlvo as EspecieId];
      const fatores = especie ? calcularFatores(brutos, astro.idadeLua, especie) : null;
      snapshot = {
        nota: fatores ? somarNota(fatores) : null,
        fatores: { brutos, fatores },
        mediaAr: mediaAr(dias, i, diasDaMedia(local.tipo)),
      };
    }
  } catch (err) {
    console.warn("Pescaria sem retrato do clima:", err);
  }

  try {
    const r = await gravarSaida(saida, snapshot);
    return NextResponse.json({ ok: true, ...r }, { status: r.duplicada ? 200 : 201 });
  } catch (err) {
    console.error("Falha ao gravar a saída:", err);
    return NextResponse.json({ erro: "Não foi possível gravar." }, { status: 503 });
  }
}
