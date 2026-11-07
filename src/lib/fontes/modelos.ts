import { CACHE_SEG, MODELOS, MODELO_IDS, VARIAVEIS, faixaDaHora, type ModeloId, type VariavelId } from "@/config/fontes";
import type { Discordancia, ResumoModelo, SerieClima } from "@/lib/indice/tipos";
import { buscarTexto, type Resposta } from "./guardar";

/** A previsão de cada modelo, hora a hora, no mesmo eixo de tempo (hora local). */
export interface PrevisaoModelos {
  tempo: string[];
  valores: Partial<Record<ModeloId, Record<VariavelId, (number | null)[]>>>;
}

/** Peso de cada modelo por variável e antecedência ("1" a "7" dias). Ausente: pesos iguais. */
export type PesosModelos = Partial<Record<VariavelId, Record<string, Partial<Record<ModeloId, number>>>>>;
/** Erro médio da previsão combinada por faixa de horário (4 faixas), para descontar. */
export type ViesPorFaixa = Partial<Record<VariavelId, number[]>>;

const CAMPO_SERIE: Record<VariavelId, "temp" | "pressao" | "vento" | "chuva" | "nuvens"> = {
  temp: "temp",
  pressao: "pressao",
  vento: "vento",
  chuva: "chuva",
  nuvens: "nuvens",
};

export function urlModelos(lat: number, lon: number, o: { elevacao?: number; diasPassados?: number; dias?: number } = {}) {
  const vars = VARIAVEIS.map((v) => v.api).join(",");
  const elev = o.elevacao !== undefined ? `&elevation=${o.elevacao}` : "";
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${vars}&models=${MODELO_IDS.join(",")}&past_days=${o.diasPassados ?? 1}&forecast_days=${o.dias ?? 8}&timezone=America%2FSao_Paulo&wind_speed_unit=ms${elev}`;
}

/** Separa a resposta do Open-Meteo (variáveis com o nome do modelo no fim) por modelo. Modelo sem nenhum dado fica de fora. */
export function lerModelos(texto: string): PrevisaoModelos {
  const j = JSON.parse(texto);
  if (j.error) throw new Error(j.reason ?? "Open-Meteo recusou o pedido");
  const h = j.hourly as Record<string, (number | null)[]> & { time: string[] };
  const valores: PrevisaoModelos["valores"] = {};
  for (const m of MODELO_IDS) {
    const porVar = {} as Record<VariavelId, (number | null)[]>;
    let algum = false;
    for (const v of VARIAVEIS) {
      const serie = h[`${v.api}_${m}`] ?? h.time.map(() => null);
      porVar[v.id] = serie;
      if (v.id === "temp" && serie.some((x) => x !== null)) algum = true;
    }
    if (algum) valores[m] = porVar;
  }
  return { tempo: h.time, valores };
}

export async function buscarModelos(lat: number, lon: number, o: { elevacao?: number; diasPassados?: number; dias?: number; semCache?: boolean } = {}): Promise<{ dados: PrevisaoModelos; resposta: Resposta }> {
  const r = await buscarTexto(urlModelos(lat, lon, o), { revalidar: o.semCache ? undefined : CACHE_SEG.previsao });
  if (!r.ok) throw new Error(`Open-Meteo respondeu ${r.status}`);
  return { dados: lerModelos(r.texto), resposta: r };
}

const DIA = 86_400_000;
export const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / DIA);
/** Antecedência de uma data em relação a hoje, presa entre 1 e 7 (hoje usa o peso de 1 dia). */
export const antecedencia = (data: string, hoje: string) => Math.max(1, Math.min(7, diasEntre(hoje, data)));

/**
 * A "melhor combinação" do Open-Meteo é, na verdade, um dos outros modelos (na Serra, o ECMWF IFS).
 * Quando a temperatura dela bate com a de outro em 95% das horas, ela é cópia: aparece na tela, mas não entra
 * na média, senão aquele modelo contaria duas vezes.
 */
export function copiaDe(p: PrevisaoModelos): ModeloId | null {
  const bm = p.valores.best_match;
  if (!bm) return null;
  for (const m of MODELO_IDS) {
    const outro = p.valores[m];
    if (m === "best_match" || !outro) continue;
    let n = 0;
    let iguais = 0;
    bm.temp.forEach((a, i) => {
      const b = outro.temp[i];
      if (a === null || b === null || b === undefined) return;
      n++;
      if (Math.abs(a - b) < 0.05) iguais++;
    });
    if (n >= 24 && iguais / n >= 0.95) return m;
  }
  return null;
}

/** Modelos que entram na conta: os que vieram, sem a cópia. */
export function modelosPresentes(p: PrevisaoModelos) {
  const copia = copiaDe(p) ? "best_match" : null;
  return MODELO_IDS.filter((m) => p.valores[m] && m !== copia);
}

function limitar(v: VariavelId, x: number) {
  if (v === "vento" || v === "chuva") return Math.max(0, x);
  if (v === "nuvens") return Math.max(0, Math.min(100, x));
  return x;
}

/**
 * Média ponderada dos modelos, hora a hora. Sem pesos medidos, todos valem igual.
 * Desconta o viés por faixa de horário, menos na chuva: subtrair milímetros fixos criaria chuva negativa ou inventada.
 */
export function combinar(p: PrevisaoModelos, hoje: string, pesos?: PesosModelos | null, vies?: ViesPorFaixa | null): Record<VariavelId, (number | null)[]> {
  const ms = modelosPresentes(p);
  const out = {} as Record<VariavelId, (number | null)[]>;
  for (const v of VARIAVEIS) {
    out[v.id] = p.tempo.map((t, i) => {
      const tabela = pesos?.[v.id]?.[String(antecedencia(t.slice(0, 10), hoje))];
      let soma = 0;
      let total = 0;
      let somaIgual = 0;
      let n = 0;
      for (const m of ms) {
        const x = p.valores[m]![v.id][i];
        if (x === null || x === undefined) continue;
        const w = tabela ? (tabela[m] ?? 0) : 1;
        soma += w * x;
        total += w;
        somaIgual += x;
        n++;
      }
      if (!n) return null;
      let valor = total > 0 ? soma / total : somaIgual / n;
      const corr = vies?.[v.id];
      if (corr && v.id !== "chuva") valor -= corr[faixaDaHora(Number(t.slice(11, 13)))] ?? 0;
      return limitar(v.id, valor);
    });
  }
  return out;
}

/** Troca, a partir de `aPartirDe`, as variáveis da série pelos valores dados (combinados ou de um modelo só). */
export function substituirFuturo(serie: SerieClima, tempo: string[], valores: Record<VariavelId, (number | null)[]>, aPartirDe: string): SerieClima {
  const idx = new Map(tempo.map((t, i) => [t, i]));
  const nova: SerieClima = { ...serie, temp: [...serie.temp], pressao: [...serie.pressao], vento: [...serie.vento], chuva: [...serie.chuva], nuvens: [...serie.nuvens] };
  serie.tempo.forEach((t, i) => {
    if (t < aPartirDe) return;
    const j = idx.get(t);
    if (j === undefined) return;
    for (const v of VARIAVEIS) {
      const x = valores[v.id][j];
      if (x !== null && x !== undefined) nova[CAMPO_SERIE[v.id]][i] = x;
    }
  });
  return nova;
}

/** A série de cada modelo sozinho (o passado é o mesmo para todos), para medir o quanto a nota muda de um para outro. */
export function seriesPorModelo(serie: SerieClima, p: PrevisaoModelos, aPartirDe: string): SerieClima[] {
  return modelosPresentes(p).map((m) => substituirFuturo(serie, p.tempo, p.valores[m]!, aPartirDe));
}

function resumoDoDia(p: PrevisaoModelos, m: ModeloId, data: string) {
  const idx = p.tempo.map((t, i) => (t.startsWith(data) ? i : -1)).filter((i) => i >= 0);
  const pega = (v: VariavelId) => idx.map((i) => p.valores[m]![v][i]).filter((x): x is number => x !== null && x !== undefined);
  const media = (a: number[]) => (a.length >= 18 ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const chuva = pega("chuva");
  return {
    temp: media(pega("temp")),
    pressao: media(pega("pressao")),
    vento: media(pega("vento")),
    nuvens: media(pega("nuvens")),
    chuva: chuva.length >= 18 ? chuva.reduce((s, x) => s + x, 0) : null,
  };
}

/** Para cada dia: diferença entre o modelo que mais previu e o que menos previu, em cada variável. */
export function discordanciaPorDia(p: PrevisaoModelos): Map<string, Discordancia> {
  const datas = [...new Set(p.tempo.map((t) => t.slice(0, 10)))];
  const out = new Map<string, Discordancia>();
  for (const d of datas) {
    const rs = modelosPresentes(p).map((m) => resumoDoDia(p, m, d)).filter((r) => r.temp !== null);
    if (rs.length < 2) continue;
    const faixa = (k: "temp" | "chuva" | "vento" | "pressao") => {
      const xs = rs.map((r) => r[k]).filter((x): x is number => x !== null);
      return xs.length >= 2 ? Math.max(...xs) - Math.min(...xs) : 0;
    };
    out.set(d, { modelos: rs.length, temp: faixa("temp"), chuva: faixa("chuva"), vento: faixa("vento"), pressao: faixa("pressao") });
  }
  return out;
}

/** O que cada modelo prevê para hoje no local, com o peso que ele tem na temperatura de 1 dia. */
export function resumoDeHoje(p: PrevisaoModelos, hoje: string, pesos?: PesosModelos | null): ResumoModelo[] {
  const ms = modelosPresentes(p);
  const copia = copiaDe(p);
  const tabela = pesos?.temp?.["1"];
  const nome = (m: ModeloId) => MODELOS.find((x) => x.id === m)!.nome;
  return MODELO_IDS.filter((m) => p.valores[m]).map((m) => {
    const r = resumoDoDia(p, m, hoje);
    const fora = !ms.includes(m);
    return {
      id: m,
      nome: fora && copia ? `${nome(m)} (= ${nome(copia)})` : nome(m),
      ...r,
      peso: fora ? 0 : tabela ? (tabela[m] ?? 0) : 1 / ms.length,
    };
  });
}
