import { ANTECEDENCIAS, JANELA_PRECISAO_DIAS, MINIMO_COMPARACOES, MODELO_IDS, VARIAVEIS, VARIAVEL_IDS, faixaDaHora, type ModeloId, type VariavelId } from "@/config/fontes";
import { diasEntre, type PesosModelos, type PrevisaoModelos, type ViesPorFaixa } from "./modelos";

export interface ValorFaixa {
  data: string;
  faixa: number;
  valor: number;
}

/** Junta a série horária em faixas de 6 horas: média, ou soma na chuva. Faixa com menos de 5 horas fica de fora. */
export function agregarFaixas(tempo: string[], valores: (number | null)[], variavel: VariavelId): ValorFaixa[] {
  const grupos = new Map<string, number[]>();
  tempo.forEach((t, i) => {
    const x = valores[i];
    if (x === null || x === undefined || !Number.isFinite(x)) return;
    const chave = `${t.slice(0, 10)}|${faixaDaHora(Number(t.slice(11, 13)))}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(x);
  });
  const out: ValorFaixa[] = [];
  for (const [chave, xs] of grupos) {
    if (xs.length < 5) continue;
    const [data, f] = chave.split("|");
    const soma = xs.reduce((a, b) => a + b, 0);
    // Chuva com uma hora faltando: completa pela média das outras.
    out.push({ data, faixa: Number(f), valor: variavel === "chuva" ? (soma * 6) / xs.length : soma / xs.length });
  }
  return out;
}

export interface LinhaPrevista {
  ponto: string;
  modelo: string;
  variavel: VariavelId;
  dataAlvo: string;
  faixa: number;
  antecedencia: number;
  valor: number;
}

/** O que cada modelo prevê hoje para os próximos 7 dias, em faixas: a antecedência é a distância em dias. */
export function linhasDePrevisao(ponto: string, p: PrevisaoModelos, hoje: string): LinhaPrevista[] {
  const out: LinhaPrevista[] = [];
  for (const m of MODELO_IDS) {
    const vs = p.valores[m];
    if (!vs) continue;
    for (const v of VARIAVEL_IDS) {
      for (const f of agregarFaixas(p.tempo, vs[v], v)) {
        const ant = diasEntre(hoje, f.data);
        if (ant >= 1 && ant <= 7) out.push({ ponto, modelo: m, variavel: v, dataAlvo: f.data, faixa: f.faixa, antecedencia: ant, valor: f.valor });
      }
    }
  }
  return out;
}

export function urlRodadasAnteriores(lat: number, lon: number, elevacao: number, diasPassados: number) {
  const vars = VARIAVEIS.flatMap((v) => ANTECEDENCIAS.map((n) => `${v.api}_previous_day${n}`)).join(",");
  return `https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&elevation=${elevacao}&hourly=${vars}&models=${MODELO_IDS.join(",")}&past_days=${diasPassados}&forecast_days=1&timezone=America%2FSao_Paulo&wind_speed_unit=ms`;
}

/**
 * Lê a Previous Runs API: `temperature_2m_previous_day3_gfs_seamless` é o que o GFS previa 3 dias antes para cada hora.
 * Só entram dias que já passaram, para comparar com o que aconteceu.
 */
export function linhasDeRodadasAnteriores(ponto: string, texto: string, hoje: string): LinhaPrevista[] {
  const j = JSON.parse(texto);
  if (j.error) throw new Error(j.reason ?? "Previous Runs recusou o pedido");
  const h = j.hourly as Record<string, (number | null)[]> & { time: string[] };
  const out: LinhaPrevista[] = [];
  for (const m of MODELO_IDS) {
    for (const v of VARIAVEIS) {
      for (const n of ANTECEDENCIAS) {
        const serie = h[`${v.api}_previous_day${n}_${m}`];
        if (!serie) continue;
        for (const f of agregarFaixas(h.time, serie, v.id)) {
          if (f.data < hoje) out.push({ ponto, modelo: m, variavel: v.id, dataAlvo: f.data, faixa: f.faixa, antecedencia: n, valor: f.valor });
        }
      }
    }
  }
  return out;
}

export interface Par {
  ponto: string;
  modelo: string;
  variavel: VariavelId;
  dataAlvo: string;
  faixa: number;
  antecedencia: number;
  previsto: number;
  observado: number;
  origem: string;
}

export interface ErroModelo {
  modelo: ModeloId | "combinado";
  variavel: VariavelId;
  antecedencia: number;
  mae: number;
  n: number;
}

export type Verdade = "observado" | "estimado" | "nenhuma";

export interface ResumoPrecisao {
  calculadoEm: string;
  janela: { de: string; ate: string };
  /** Contra o que cada variável foi conferida: estação de verdade ou estimativa do Open-Meteo. */
  verdade: Record<VariavelId, Verdade>;
  dias: Record<VariavelId, number>;
  erros: ErroModelo[];
  /** Só para variáveis conferidas com estação e com dias suficientes. */
  pesos: PesosModelos;
  /** Por ponto de conferência: erro médio da previsão combinada em cada faixa (positivo = previu demais). */
  vies: Record<string, ViesPorFaixa>;
  /** Modelo que é cópia de outro: tem o erro calculado, mas fica fora dos pesos e da média. */
  copias?: Partial<Record<ModeloId, ModeloId>>;
}

/** A "melhor combinação" que repete outro modelo em 95% das comparações é cópia dele. */
function acharCopias(pares: Par[]): Partial<Record<ModeloId, ModeloId>> {
  const porGrupo = new Map<string, Map<string, number>>();
  for (const p of pares) {
    const k = chaveGrupo(p);
    if (!porGrupo.has(k)) porGrupo.set(k, new Map());
    porGrupo.get(k)!.set(p.modelo, p.previsto);
  }
  for (const m of MODELO_IDS) {
    if (m === "best_match") continue;
    let n = 0;
    let iguais = 0;
    for (const g of porGrupo.values()) {
      const a = g.get("best_match");
      const b = g.get(m);
      if (a === undefined || b === undefined) continue;
      n++;
      if (Math.abs(a - b) < 0.05) iguais++;
    }
    if (n >= 20 && iguais / n >= 0.95) return { best_match: m };
  }
  return {};
}

const chaveGrupo = (p: Par) => `${p.ponto}|${p.variavel}|${p.dataAlvo}|${p.faixa}|${p.antecedencia}`;

/**
 * Erro médio absoluto de cada modelo por variável e antecedência, nos últimos 30 dias.
 * Peso = 1 / erro², normalizado. A correção de viés usa a previsão combinada de 1 a 3 dias, por faixa de horário.
 * Pesos e viés só valem contra estação de verdade: corrigir um modelo comparando com outro modelo não melhora nada.
 */
export function calcularPrecisao(pares: Par[], hoje: string, agora = new Date()): ResumoPrecisao {
  const de = new Date(Date.parse(hoje) - JANELA_PRECISAO_DIAS * 86_400_000).toISOString().slice(0, 10);
  const ate = new Date(Date.parse(hoje) - 86_400_000).toISOString().slice(0, 10);
  const naJanela = pares.filter((p) => p.dataAlvo >= de && p.dataAlvo <= ate && MODELO_IDS.includes(p.modelo as ModeloId));
  const copias = acharCopias(naJanela);
  const conta = (m: string) => !(m in copias);

  const verdade = {} as Record<VariavelId, Verdade>;
  const dias = {} as Record<VariavelId, number>;
  for (const v of VARIAVEL_IDS) {
    const ps = naJanela.filter((p) => p.variavel === v);
    const medidos = ps.filter((p) => p.origem !== "estimado").length;
    verdade[v] = !ps.length ? "nenhuma" : medidos * 2 >= ps.length ? "observado" : "estimado";
    dias[v] = new Set(ps.map((p) => p.dataAlvo)).size;
  }

  // Erro de cada modelo.
  const acum = new Map<string, { soma: number; n: number }>();
  const soma = (k: string, x: number) => {
    const a = acum.get(k) ?? { soma: 0, n: 0 };
    a.soma += x;
    a.n++;
    acum.set(k, a);
  };
  for (const p of naJanela) soma(`${p.modelo}|${p.variavel}|${p.antecedencia}`, Math.abs(p.previsto - p.observado));

  const erros: ErroModelo[] = [];
  const pesos: PesosModelos = {};
  for (const v of VARIAVEL_IDS) {
    const usaPeso = verdade[v] === "observado" && dias[v] >= MINIMO_COMPARACOES;
    for (const ant of ANTECEDENCIAS) {
      const linha: Partial<Record<ModeloId, number>> = {};
      for (const m of MODELO_IDS) {
        const a = acum.get(`${m}|${v}|${ant}`);
        if (!a?.n) continue;
        const mae = a.soma / a.n;
        erros.push({ modelo: m, variavel: v, antecedencia: ant, mae, n: a.n });
        if (usaPeso && conta(m) && a.n >= MINIMO_COMPARACOES) linha[m] = 1 / Math.max(mae, 0.05) ** 2;
      }
      const total = Object.values(linha).reduce((s, x) => s + (x ?? 0), 0);
      if (usaPeso && total > 0) {
        for (const m of Object.keys(linha) as ModeloId[]) linha[m] = linha[m]! / total;
        (pesos[v] ??= {})[String(ant)] = linha;
      }
    }
  }

  // A previsão combinada (com os pesos acima) de cada ponto, dia e faixa.
  const grupos = new Map<string, Par[]>();
  for (const p of naJanela) {
    const k = chaveGrupo(p);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(p);
  }
  const viesAcum = new Map<string, { soma: number; n: number }>();
  for (const ps of grupos.values()) {
    const { ponto, variavel: v, antecedencia: ant, faixa, observado } = ps[0];
    const tabela = pesos[v]?.[String(ant)];
    let s = 0;
    let t = 0;
    for (const p of ps) {
      if (!conta(p.modelo)) continue;
      const w = tabela ? (tabela[p.modelo as ModeloId] ?? 0) : 1;
      s += w * p.previsto;
      t += w;
    }
    if (t <= 0) continue;
    const comb = s / t;
    soma(`combinado|${v}|${ant}`, Math.abs(comb - observado));
    if (ant <= 3) {
      const k = `${ponto}|${v}|${faixa}`;
      const a = viesAcum.get(k) ?? { soma: 0, n: 0 };
      a.soma += comb - observado;
      a.n++;
      viesAcum.set(k, a);
    }
  }
  for (const v of VARIAVEL_IDS) {
    for (const ant of ANTECEDENCIAS) {
      const a = acum.get(`combinado|${v}|${ant}`);
      if (a?.n) erros.push({ modelo: "combinado", variavel: v, antecedencia: ant, mae: a.soma / a.n, n: a.n });
    }
  }

  const vies: Record<string, ViesPorFaixa> = {};
  for (const [k, a] of viesAcum) {
    const [ponto, v, faixa] = k.split("|") as [string, VariavelId, string];
    if (v === "chuva" || verdade[v] !== "observado" || a.n < MINIMO_COMPARACOES) continue;
    const linha = ((vies[ponto] ??= {})[v] ??= [0, 0, 0, 0]);
    linha[Number(faixa)] = Math.round((a.soma / a.n) * 100) / 100;
  }

  return { calculadoEm: agora.toISOString(), janela: { de, ate }, verdade, dias, erros, pesos, vies, copias };
}
