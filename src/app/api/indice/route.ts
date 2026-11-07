import { NextResponse } from "next/server";
import { listarLocais } from "@/lib/db/consultas";
import { gerarPrevisao } from "@/lib/indice/previsao";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("local");
  const locais = await listarLocais();
  const local = locais.find((l) => l.id === id) ?? locais[0];
  try {
    const previsao = await gerarPrevisao(local, locais);
    return NextResponse.json(previsao, {
      // Só a CDN guarda. Se o navegador guardasse, o pescador não saberia que ficou sem sinal.
      headers: {
        "Cache-Control": "public, max-age=0",
        "CDN-Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("Falha ao gerar a previsão:", err);
    return NextResponse.json({ erro: "Não foi possível buscar o clima agora." }, { status: 502 });
  }
}
