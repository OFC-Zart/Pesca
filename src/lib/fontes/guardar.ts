import { gunzipSync, gzipSync } from "node:zlib";
import { desc, eq, lt } from "drizzle-orm";
import { after } from "next/server";
import { RETENCAO_DIAS, TEMPO_LIMITE_FUNDO_MS, TEMPO_LIMITE_MS } from "@/config/fontes";
import { getDb } from "@/lib/db";
import { fontesBrutas, fontesStatus } from "@/lib/db/schema";

export type EstadoFonte = "ok" | "atrasada" | "falhou" | "desligada";

export interface Resposta {
  ok: boolean;
  status: number;
  texto: string;
  tipo: string;
  /** Quando a fonte gerou a resposta (cabeçalho Date). Numa resposta guardada em cache, é a hora original. */
  obtidoEm: Date;
}

/** Busca um endereço com tempo limite. Com `revalidar`, a resposta fica no cache de dados do Next por esse tempo. */
export async function buscarTexto(url: string, opcoes: { revalidar?: number; tempoMs?: number; headers?: Record<string, string> } = {}): Promise<Resposta> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(opcoes.tempoMs ?? TEMPO_LIMITE_MS),
    headers: opcoes.headers,
    ...(opcoes.revalidar ? { next: { revalidate: opcoes.revalidar } } : { cache: "no-store" as const }),
  });
  const texto = await r.text();
  const data = r.headers.get("date");
  return { ok: r.ok, status: r.status, texto, tipo: r.headers.get("content-type") ?? "", obtidoEm: data ? new Date(data) : new Date() };
}

/** Roda depois de a resposta sair, para ninguém esperar. Fora de uma requisição (testes, scripts), roda na hora. */
export function depois(tarefa: () => Promise<unknown>) {
  const segura = () => tarefa().catch((err) => console.warn("Tarefa de fundo falhou:", err));
  try {
    after(segura);
  } catch {
    void segura();
  }
}

export const comprimir = (texto: string) => gzipSync(Buffer.from(texto, "utf8")).toString("base64");
export const descomprimir = (b64: string) => gunzipSync(Buffer.from(b64, "base64")).toString("utf8");

const mensagem = (err: unknown) => {
  if (err instanceof Error) return err.name === "TimeoutError" || err.name === "AbortError" ? "Não respondeu a tempo" : err.message.slice(0, 200);
  return String(err).slice(0, 200);
};

interface Identidade {
  fonte: string;
  nome: string;
  grupo: string;
}

/** Anota a tentativa: hora, acerto ou erro. Nunca derruba quem chamou. */
export async function anotarStatus(id: Identidade, r: { ok: boolean; dadoDe?: Date | null; erro?: string | null }) {
  const db = getDb();
  if (!db) return;
  const agora = new Date();
  const valores = r.ok
    ? { ultimaTentativa: agora, ultimoSucesso: agora, dadoDe: r.dadoDe ?? agora, erro: null }
    : { ultimaTentativa: agora, erro: r.erro ?? "Falhou" };
  try {
    await db
      .insert(fontesStatus)
      .values({ fonte: id.fonte, nome: id.nome, grupo: id.grupo, ...valores })
      .onConflictDoUpdate({ target: fontesStatus.fonte, set: { nome: id.nome, grupo: id.grupo, ...valores } });
  } catch (err) {
    console.warn("Falha ao anotar a fonte", id.fonte, err);
  }
}

/** Marca só a hora da tentativa, para duas requisições não buscarem a mesma fonte ao mesmo tempo. */
async function marcarTentativa(id: Identidade) {
  const db = getDb();
  if (!db) return;
  const agora = new Date();
  await db
    .insert(fontesStatus)
    .values({ fonte: id.fonte, nome: id.nome, grupo: id.grupo, ultimaTentativa: agora })
    .onConflictDoUpdate({ target: fontesStatus.fonte, set: { ultimaTentativa: agora } });
}

/** Guarda a resposta bruta, comprimida. A mesma resposta (mesma hora de origem) não é gravada duas vezes. */
export async function guardarBruto(fonte: string, r: Resposta) {
  const db = getDb();
  if (!db) return;
  try {
    await db
      .insert(fontesBrutas)
      .values({ fonte, obtidoEm: r.obtidoEm, status: r.status, tipo: r.tipo.slice(0, 80), tamanho: r.texto.length, conteudo: comprimir(r.texto) })
      .onConflictDoNothing();
  } catch (err) {
    console.warn("Falha ao guardar a resposta de", fonte, err);
  }
}

export async function ultimaBruta(fonte: string) {
  const db = getDb();
  if (!db) return null;
  const [linha] = await db.select().from(fontesBrutas).where(eq(fontesBrutas.fonte, fonte)).orderBy(desc(fontesBrutas.obtidoEm)).limit(1);
  return linha ? { texto: descomprimir(linha.conteudo), obtidoEm: linha.obtidoEm } : null;
}

export async function apagarBrutasAntigas(hoje = new Date()) {
  const db = getDb();
  if (!db) return 0;
  const corte = new Date(hoje.getTime() - RETENCAO_DIAS.brutas * 86_400_000);
  const r = await db.delete(fontesBrutas).where(lt(fontesBrutas.obtidoEm, corte)).returning({ id: fontesBrutas.id });
  return r.length;
}

export interface Obtido<T> {
  dados: T | null;
  estado: EstadoFonte;
  obtidoEm: Date | null;
}

/**
 * Lê uma fonte de observação guardada no banco e, se estiver velha, atualiza por trás.
 * Assim a ANA, que às vezes leva mais de 30 s, nunca segura a tela. Sem banco, busca direto com tempo limite.
 * `ler` transforma o texto bruto e deve lançar erro quando a resposta não serve.
 */
export async function obterFonte<T>(o: Identidade & { validadeSeg: number; buscar: (tempoMs: number, usarCache: boolean) => Promise<Resposta>; ler: (texto: string) => T }): Promise<Obtido<T>> {
  const db = getDb();
  // Com banco, o próprio banco é o cache; sem banco, vale o cache de dados do Next.
  const buscarEGuardar = async (tempoMs: number): Promise<{ dados: T; obtidoEm: Date }> => {
    try {
      const r = await o.buscar(tempoMs, !db);
      if (!r.ok) throw new Error(`Respondeu ${r.status}`);
      const dados = o.ler(r.texto);
      await guardarBruto(o.fonte, r);
      await anotarStatus(o, { ok: true, dadoDe: r.obtidoEm });
      return { dados, obtidoEm: r.obtidoEm };
    } catch (err) {
      await anotarStatus(o, { ok: false, erro: mensagem(err) });
      throw err;
    }
  };

  if (!db) {
    try {
      const r = await buscarEGuardar(TEMPO_LIMITE_MS);
      return { ...r, estado: "ok" };
    } catch {
      return { dados: null, estado: "falhou", obtidoEm: null };
    }
  }

  let guardada: { dados: T; obtidoEm: Date } | null = null;
  try {
    const b = await ultimaBruta(o.fonte);
    if (b) guardada = { dados: o.ler(b.texto), obtidoEm: b.obtidoEm };
  } catch (err) {
    console.warn("Resposta guardada ilegível de", o.fonte, err);
  }

  const idade = guardada ? (Date.now() - guardada.obtidoEm.getTime()) / 1000 : Infinity;
  if (guardada && idade < o.validadeSeg) return { ...guardada, estado: "ok" };

  const [st] = await db.select().from(fontesStatus).where(eq(fontesStatus.fonte, o.fonte)).catch(() => []);
  const tentouHaPouco = Boolean(st && Date.now() - st.ultimaTentativa.getTime() < 120_000);

  // Velha: entrega o que tem e atualiza por trás, sem repetir se outra requisição acabou de tentar.
  if (guardada) {
    if (!tentouHaPouco) {
      await marcarTentativa(o).catch(() => {});
      depois(() => buscarEGuardar(TEMPO_LIMITE_FUNDO_MS));
    }
    return { ...guardada, estado: idade < 2 * o.validadeSeg ? "ok" : "atrasada" };
  }

  // Nada guardado: tenta na hora, com o tempo limite normal. Se não der, segue sem e tenta por trás com mais tempo.
  if (tentouHaPouco) return { dados: null, estado: "falhou", obtidoEm: null };
  try {
    return { ...(await buscarEGuardar(TEMPO_LIMITE_MS)), estado: "ok" };
  } catch {
    depois(() => buscarEGuardar(TEMPO_LIMITE_FUNDO_MS));
    return { dados: null, estado: "falhou", obtidoEm: null };
  }
}
