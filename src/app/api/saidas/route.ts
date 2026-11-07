import { NextResponse } from "next/server";
import { ESPECIES, VERSAO_MODELO, type EspecieId } from "@/config/indice";
import { getDb } from "@/lib/db";
import { gravarSaida, listarLocais, listarSaidas } from "@/lib/db/consultas";
import { esquemaSaida } from "@/lib/esquemas";
import { calcularAstro } from "@/lib/indice/astro";
import { prepararHoras } from "@/lib/indice/agua";
import { avaliarDia } from "@/lib/indice/calculo";
import { buscarClima } from "@/lib/openmeteo";
import { sessaoDaRequisicao } from "@/lib/sessao";

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

  // Guarda o clima e a nota daquele momento para a calibração. Sem clima, a pescaria é gravada do mesmo jeito.
  let snapshot: { nota: number | null; fatores: unknown; aguaModelo: number | null } = { nota: null, fatores: null, aguaModelo: null };
  try {
    const { serie, offsetSeg } = await buscarClima(local.lat, local.lon);
    const horas = prepararHoras(serie, local).filter((h) => h.data === saida.data);
    if (horas.length) {
      const horaInicio = Number(saida.inicio.slice(0, 2));
      const noInicio = horas.find((h) => h.hora === horaInicio) ?? horas[0];
      const astro = calcularAstro(saida.data, local.lat, local.lon, offsetSeg);
      const especie = ESPECIES[saida.especieAlvo as EspecieId];
      const dia = especie ? avaliarDia(horas, especie, astro) : null;
      snapshot = {
        nota: dia?.nota ?? null,
        fatores: { versao: VERSAO_MODELO, clima: noInicio, fatores: dia?.fatores ?? null, horario: dia?.horario ?? null },
        aguaModelo: noInicio.aguaModelo,
      };
    }
  } catch (err) {
    console.warn("Pescaria sem retrato do clima:", err);
  }

  try {
    const sessao = await sessaoDaRequisicao(req);
    const r = await gravarSaida(saida, snapshot, sessao?.uid ?? null);
    return NextResponse.json({ ok: true, ...r }, { status: r.duplicada ? 200 : 201 });
  } catch (err) {
    console.error("Falha ao gravar a saída:", err);
    return NextResponse.json({ erro: "Não foi possível gravar." }, { status: 503 });
  }
}
