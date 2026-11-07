import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { PONTOS_VERIFICACAO, RETENCAO_DIAS } from "@/config/fontes";
import { getDb } from "@/lib/db";
import { fontesStatus, niveisRepresa, observacoes, precisao, previsoesModelos } from "@/lib/db/schema";
import type { NivelDiario } from "./ons";
import type { LinhaPrevista, Par, ResumoPrecisao, ValorFaixa } from "./precisao";
import type { VariavelId } from "@/config/fontes";

const menos = (hoje: string, dias: number) => new Date(Date.parse(hoje) - dias * 86_400_000).toISOString().slice(0, 10);

async function emLotes<T>(linhas: T[], tamanho: number, fn: (lote: T[]) => Promise<unknown>) {
  for (let i = 0; i < linhas.length; i += tamanho) await fn(linhas.slice(i, i + tamanho));
}

/** O resumo de precisão mais recente: dele saem os pesos dos modelos e a correção de viés. */
export async function ultimaPrecisao(): Promise<ResumoPrecisao | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [l] = await db.select().from(precisao).orderBy(desc(precisao.data)).limit(1);
    return (l?.resumo as ResumoPrecisao) ?? null;
  } catch (err) {
    console.warn("Sem resumo de precisão:", err);
    return null;
  }
}

export async function gravarPrecisao(data: string, resumo: ResumoPrecisao) {
  const db = getDb();
  if (!db) return;
  await db.insert(precisao).values({ data, resumo }).onConflictDoUpdate({ target: precisao.data, set: { resumo } });
}

export async function niveisDaRepresa(represa: string, hoje: string) {
  const db = getDb();
  if (!db) return [];
  return db
    .select()
    .from(niveisRepresa)
    .where(and(eq(niveisRepresa.represa, represa), gte(niveisRepresa.data, menos(hoje, 12))))
    .orderBy(niveisRepresa.data);
}

export async function gravarNiveis(niveis: NivelDiario[], origem: string) {
  const db = getDb();
  if (!db || !niveis.length) return;
  await emLotes(niveis, 200, (lote) =>
    db
      .insert(niveisRepresa)
      .values(lote.map((n) => ({ ...n, origem })))
      .onConflictDoUpdate({ target: [niveisRepresa.represa, niveisRepresa.data], set: { nivel: sql`excluded.nivel`, volume: sql`excluded.volume`, origem: sql`excluded.origem` } }),
  );
}

export async function gravarPrevistas(linhas: LinhaPrevista[], criadoEm: string) {
  const db = getDb();
  if (!db || !linhas.length) return 0;
  await emLotes(linhas, 800, (lote) => db.insert(previsoesModelos).values(lote.map((l) => ({ ...l, criadoEm }))).onConflictDoNothing());
  return linhas.length;
}

/** Medição de estação substitui a estimativa; estimativa nunca passa por cima de medição. */
export async function gravarObservadas(ponto: string, variavel: VariavelId, valores: ValorFaixa[], origem: string) {
  const db = getDb();
  if (!db || !valores.length) return;
  const linhas = valores.map((v) => ({ ponto, variavel, data: v.data, faixa: v.faixa, valor: v.valor, origem }));
  const alvo = [observacoes.ponto, observacoes.variavel, observacoes.data, observacoes.faixa];
  await emLotes(linhas, 500, (lote) =>
    origem === "estimado"
      ? db.insert(observacoes).values(lote).onConflictDoNothing()
      : db.insert(observacoes).values(lote).onConflictDoUpdate({ target: alvo, set: { valor: sql`excluded.valor`, origem: sql`excluded.origem` } }),
  );
}

/** Quantas previsões já existem para um ponto em dias passados: zero quer dizer que é preciso buscar o histórico de rodadas. */
export async function previsoesPassadas(ponto: string, hoje: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(previsoesModelos)
    .where(and(eq(previsoesModelos.ponto, ponto), lt(previsoesModelos.dataAlvo, menos(hoje, 7))));
  return r?.n ?? 0;
}

/** Previsão e observação lado a lado, na janela de conferência. Um ponto por vez, para a resposta do banco não ficar enorme. */
export async function paresDaJanela(hoje: string, dias: number): Promise<Par[]> {
  const db = getDb();
  if (!db) return [];
  const pares: Par[] = [];
  for (const ponto of PONTOS_VERIFICACAO) pares.push(...(await paresDoPonto(ponto, hoje, dias)));
  return pares;
}

async function paresDoPonto(ponto: string, hoje: string, dias: number): Promise<Par[]> {
  const db = getDb()!;
  const linhas = await db
    .select({
      ponto: previsoesModelos.ponto,
      modelo: previsoesModelos.modelo,
      variavel: previsoesModelos.variavel,
      dataAlvo: previsoesModelos.dataAlvo,
      faixa: previsoesModelos.faixa,
      antecedencia: previsoesModelos.antecedencia,
      previsto: previsoesModelos.valor,
      observado: observacoes.valor,
      origem: observacoes.origem,
    })
    .from(previsoesModelos)
    .innerJoin(
      observacoes,
      and(
        eq(observacoes.ponto, previsoesModelos.ponto),
        eq(observacoes.variavel, previsoesModelos.variavel),
        eq(observacoes.data, previsoesModelos.dataAlvo),
        eq(observacoes.faixa, previsoesModelos.faixa),
      ),
    )
    .where(and(eq(previsoesModelos.ponto, ponto), gte(previsoesModelos.dataAlvo, menos(hoje, dias)), lte(previsoesModelos.dataAlvo, menos(hoje, 1))));
  return linhas.map((l) => ({ ...l, variavel: l.variavel as VariavelId }));
}

export async function limparAntigos(hoje: string) {
  const db = getDb();
  if (!db) return {};
  const contar = async (q: Promise<{ x: unknown }[]>) => (await q).length;
  return {
    previsoesModelos: await contar(db.delete(previsoesModelos).where(lt(previsoesModelos.dataAlvo, menos(hoje, RETENCAO_DIAS.previsoesModelos))).returning({ x: previsoesModelos.id })),
    observacoes: await contar(db.delete(observacoes).where(lt(observacoes.data, menos(hoje, RETENCAO_DIAS.observacoes))).returning({ x: observacoes.ponto })),
    precisao: await contar(db.delete(precisao).where(lt(precisao.data, menos(hoje, RETENCAO_DIAS.precisao))).returning({ x: precisao.data })),
    niveis: await contar(db.delete(niveisRepresa).where(lt(niveisRepresa.data, menos(hoje, RETENCAO_DIAS.observacoes))).returning({ x: niveisRepresa.data })),
  };
}

export async function statusDasFontes() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(fontesStatus).orderBy(fontesStatus.grupo, fontesStatus.nome);
}
