import { and, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { DIAS_GUARDAR_PREVISOES, LOCAIS_PADRAO, MEDICOES_PARA_CALIBRAR, type TipoAgua } from "@/config/indice";
import { regressao } from "@/lib/indice/calculo";
import type { Local } from "@/lib/indice/tipos";
import type { EntradaSaida } from "@/lib/esquemas";
import { getDb } from "./index";
import { capturas, locais, medicoesAgua, previsoes, saidas } from "./schema";

const PADRAO: Local[] = LOCAIS_PADRAO.map((l) => ({ ...l }));

/** Locais do banco; sem banco (ou com banco fora do ar) usa os da configuração. */
export async function listarLocais(): Promise<Local[]> {
  const db = getDb();
  if (!db) return PADRAO;
  try {
    const linhas = await db.select().from(locais).orderBy(locais.nome);
    if (!linhas.length) return PADRAO;
    return linhas.map((l) => ({ ...l, tipo: l.tipo as TipoAgua }));
  } catch (err) {
    console.error("Falha ao ler locais, usando os padrões:", err);
    return PADRAO;
  }
}

export async function criarLocal(l: Omit<Local, "calibA" | "calibB" | "calibN">) {
  const db = getDb();
  if (!db) throw new Error("Banco não configurado");
  await db.insert(locais).values(l);
}

export async function gravarSaida(s: EntradaSaida, snapshot: { nota: number | null; fatores: unknown; mediaAr: number | null }) {
  const db = getDb();
  if (!db) throw new Error("Banco não configurado");

  const [nova] = await db
    .insert(saidas)
    .values({
      clienteId: s.clienteId,
      data: s.data,
      inicio: s.inicio,
      fim: s.fim,
      localId: s.localId,
      especieAlvo: s.especieAlvo,
      isca: s.isca || null,
      apelido: s.apelido || null,
      nota: snapshot.nota,
      fatores: snapshot.fatores,
    })
    .onConflictDoNothing({ target: saidas.clienteId })
    .returning({ id: saidas.id });

  // Reenvio da mesma pescaria: já está gravada.
  if (!nova) return { duplicada: true };

  if (s.capturas.length) {
    await db.insert(capturas).values(s.capturas.map((c) => ({ saidaId: nova.id, especie: c.especie, quantidade: c.quantidade })));
  }
  if (s.tempAgua !== undefined) {
    await db.insert(medicoesAgua).values({
      localId: s.localId,
      medidoEm: new Date(`${s.data}T${s.inicio}:00-03:00`),
      temperatura: s.tempAgua,
      mediaAr: snapshot.mediaAr,
    });
    await recalibrarLocal(s.localId);
  }
  return { duplicada: false };
}

/** A partir de 10 medições, a regressão do local substitui a estimativa pelo tipo de água. */
export async function recalibrarLocal(localId: string) {
  const db = getDb();
  if (!db) return;
  const pontos = await db
    .select({ x: medicoesAgua.mediaAr, y: medicoesAgua.temperatura })
    .from(medicoesAgua)
    .where(and(eq(medicoesAgua.localId, localId), isNotNull(medicoesAgua.mediaAr)));
  const validos = pontos.map((p) => ({ x: p.x as number, y: p.y }));
  const ajuste = validos.length >= MEDICOES_PARA_CALIBRAR ? regressao(validos) : null;
  await db
    .update(locais)
    .set({ calibA: ajuste?.a ?? null, calibB: ajuste?.b ?? null, calibN: validos.length })
    .where(eq(locais.id, localId));
}

export async function listarSaidas(limite = 200) {
  const db = getDb();
  if (!db) return null;
  const linhas = await db
    .select()
    .from(saidas)
    .orderBy(desc(saidas.data), desc(saidas.inicio))
    .limit(limite);
  if (!linhas.length) return [];
  const caps = await db
    .select()
    .from(capturas)
    .where(inArray(capturas.saidaId, linhas.map((l) => l.id)));
  return linhas.map((l) => ({
    clienteId: l.clienteId,
    data: l.data,
    inicio: l.inicio,
    fim: l.fim,
    localId: l.localId,
    especieAlvo: l.especieAlvo,
    isca: l.isca,
    apelido: l.apelido,
    nota: l.nota,
    capturas: caps.filter((c) => c.saidaId === l.id).map((c) => ({ especie: c.especie, quantidade: c.quantidade })),
  }));
}

/** Apaga as cópias de previsão feitas há mais de 90 dias. Pescarias e medições nunca são apagadas. */
export async function limparPrevisoesAntigas(hoje: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const corte = new Date(`${hoje}T12:00:00Z`);
  corte.setUTCDate(corte.getUTCDate() - DIAS_GUARDAR_PREVISOES);
  const apagadas = await db
    .delete(previsoes)
    .where(lt(previsoes.criadoEm, corte.toISOString().slice(0, 10)))
    .returning({ id: previsoes.id });
  return apagadas.length;
}
