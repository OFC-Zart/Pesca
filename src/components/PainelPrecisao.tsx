"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Info, LineChart, RefreshCw, Scale, TriangleAlert } from "lucide-react";
import { ANTECEDENCIAS, ESTACOES_INMET, FAIXAS, MODELOS, VARIAVEIS, type VariavelId } from "@/config/fontes";
import { fmt } from "@/lib/indice/calculo";
import type { ResumoPrecisao } from "@/lib/fontes/precisao";
import { TituloSecao } from "./TituloSecao";

/**
 * Cores dos modelos, sempre na mesma ordem. Validadas contra o fundo do painel (#1c2519):
 * faixa de luminosidade, croma, separação para daltonismo (pior par 8,4) e contraste acima de 3:1.
 */
const COR_MODELO: Record<string, string> = {
  best_match: "#3987e5",
  ecmwf_ifs: "#d95926",
  gfs_seamless: "#199e70",
  icon_seamless: "#c98500",
  gem_seamless: "#d55181",
  jma_seamless: "#008300",
  combinado: "#f3f0e4",
};
const NOME: Record<string, string> = { ...Object.fromEntries(MODELOS.map((m) => [m.id, m.nome])), combinado: "Média ponderada (o que o índice usa)" };
const SERIES = [...MODELOS.map((m) => m.id as string), "combinado"];

type Erros = Record<string, Record<number, number | undefined>>;

function tabelaDeErros(r: ResumoPrecisao, v: VariavelId): Erros {
  const out: Erros = {};
  for (const e of r.erros) if (e.variavel === v) (out[e.modelo] ??= {})[e.antecedencia] = e.mae;
  return out;
}

/** Passo redondo para o eixo, com 4 a 5 marcas. */
function passoBonito(max: number) {
  const bruto = max / 5;
  const pot = 10 ** Math.floor(Math.log10(bruto || 1));
  const n = bruto / pot;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pot;
}

/** Erro médio por antecedência, uma linha por modelo. Passe o dedo ou o mouse para ver os valores de cada dia. */
function Grafico({ erros, unidade, nomes }: { erros: Erros; unidade: string; nomes: Record<string, string> }) {
  const [foco, setFoco] = useState<number | null>(null);
  // O desenho usa a largura real da tela: assim a letra fica com 12 px de verdade, também no celular.
  const caixa = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = (w: number) => w > 0 && setW(Math.max(280, Math.round(w)));
    medir(el.getBoundingClientRect().width);
    const obs = new ResizeObserver(([e]) => medir(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const estreito = W < 460;
  const H = estreito ? 220 : 270;
  const m = { l: 40, r: 12, t: 12, b: 30 };
  const valores = Object.values(erros).flatMap((l) => Object.values(l).filter((x): x is number => x != null));
  const passo = passoBonito(Math.max(...valores, 0.1) * 1.05);
  const topo = Math.ceil((Math.max(...valores, 0.1) * 1.05) / passo) * passo;
  const x = (ant: number) => m.l + ((ant - 1) / 6) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v / topo) * (H - m.t - m.b);
  const marcas = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
  const presentes = SERIES.filter((s) => erros[s]);

  function mover(ev: PointerEvent<SVGRectElement>) {
    const caixa = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - caixa.left) / caixa.width) * (W - m.l - m.r);
    setFoco(Math.max(1, Math.min(7, Math.round(px / ((W - m.l - m.r) / 6)) + 1)));
  }

  const lista = foco
    ? presentes
        .map((s) => ({ s, v: erros[s]?.[foco] }))
        .filter((p): p is { s: string; v: number } => p.v != null)
        .sort((a, b) => a.v - b.v)
    : [];

  return (
    <figure className="relative">
      <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-osso/90" aria-label="Legenda">
        {presentes.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden>
              <line x1="1" y1="4" x2="17" y2="4" stroke={COR_MODELO[s]} strokeWidth={s === "combinado" ? 3 : 2} strokeLinecap="round" />
            </svg>
            {s === "combinado" ? "Média ponderada" : nomes[s]}
          </li>
        ))}
      </ul>
      <div ref={caixa} className="w-full" />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto max-w-full touch-none" role="img" aria-label={`Erro médio por dias de antecedência, em ${unidade}. Os valores estão na tabela abaixo.`}>
        {marcas.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="#f3f0e4" strokeOpacity={v === 0 ? 0.3 : 0.08} />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#c2c6b6">
              {fmt(v, 2)}
            </text>
          </g>
        ))}
        {ANTECEDENCIAS.map((a) => (
          <text key={a} x={x(a)} y={H - m.b + 18} textAnchor="middle" fontSize="12" fill="#c2c6b6">
            {estreito ? `${a}d` : `${a} ${a === 1 ? "dia" : "dias"}`}
          </text>
        ))}
        {foco && <line x1={x(foco)} x2={x(foco)} y1={m.t} y2={H - m.b} stroke="#f3f0e4" strokeOpacity="0.35" strokeDasharray="3 3" />}
        {presentes.map((s) => {
          const pts = ANTECEDENCIAS.filter((a) => erros[s][a] != null).map((a) => [x(a), y(erros[s][a]!)] as const);
          const grossa = s === "combinado";
          return (
            <g key={s}>
              <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={COR_MODELO[s]} strokeWidth={grossa ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r={grossa ? 4.5 : 4} fill={COR_MODELO[s]} stroke="#1c2519" strokeWidth="2" />
              ))}
            </g>
          );
        })}
        <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} fill="transparent" onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setFoco(null)} />
      </svg>
      {foco && lista.length > 0 && (
        <div
          className="pointer-events-none absolute top-10 z-10 w-56 rounded-xl border border-osso/15 bg-mata/95 p-2.5 text-xs shadow-lg"
          style={{ left: `clamp(0px, calc(${(x(foco) / W) * 100}% ${foco > 4 ? "- 15rem" : "+ 0.75rem"}), calc(100% - 14rem))` }}
        >
          <p className="mb-1 font-semibold">
            Previsão feita {foco} {foco === 1 ? "dia" : "dias"} antes
          </p>
          <ul className="grid gap-0.5">
            {lista.map(({ s, v }) => (
              <li key={s} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: COR_MODELO[s] }} aria-hidden />
                  {s === "combinado" ? "Média ponderada" : nomes[s]}
                </span>
                <span className="font-mono">
                  {fmt(v, 2)} {unidade}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <figcaption className="mt-1 text-xs text-pedra">Erro médio absoluto: quanto, em média, a previsão errou para mais ou para menos. Menor é melhor.</figcaption>
    </figure>
  );
}

export function PainelPrecisao() {
  const [r, setR] = useState<ResumoPrecisao | null | undefined>(undefined);
  const [inmet, setInmet] = useState(false);
  const [v, setV] = useState<VariavelId>("temp");
  const [rodando, setRodando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(
    () =>
      fetch("/api/precisao")
        .then((x) => x.json())
        .then((j) => {
          setR(j.resumo);
          setInmet(j.inmet);
        })
        .catch(() => setR(null)),
    [],
  );
  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function calcularAgora() {
    setRodando(true);
    setMsg(null);
    try {
      const x = await fetch("/api/cron/previsoes", { method: "POST" });
      const j = await x.json();
      if (!x.ok) throw new Error(j.erro);
      setMsg(j.recente ? "A conferência acabou de rodar: os números abaixo já são os mais novos." : "Conferência feita.");
      await carregar();
    } catch (err) {
      setMsg(err instanceof Error && err.message ? err.message : "Não deu para calcular agora. Tente de novo mais tarde.");
    }
    setRodando(false);
  }

  const erros = useMemo(() => (r ? tabelaDeErros(r, v) : {}), [r, v]);
  const unidade = VARIAVEIS.find((x) => x.id === v)!.unidade;
  const pesos = r?.pesos?.[v];
  const vies = r ? Object.entries(r.vies ?? {}).filter(([, porVar]) => porVar[v]) : [];
  const copias = r?.copias ?? {};
  const nomes: Record<string, string> = Object.fromEntries(
    SERIES.map((s) => [s, s in copias ? `${NOME[s]} (= ${NOME[copias[s as keyof typeof copias]!]})` : NOME[s]]),
  );

  if (r === undefined) return <p className="painel p-4 text-sm text-pedra">Carregando…</p>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {!r ? (
        <div className="painel grid gap-3 p-4 text-sm">
          <p>A primeira conferência ainda não rodou. Ela busca 60 dias de previsões antigas de cada modelo e compara com o que aconteceu em Lages, São Joaquim e Campos Novos.</p>
          <button onClick={() => void calcularAgora()} disabled={rodando} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-boia font-bold text-white hover:bg-boia-clara disabled:opacity-60">
            <RefreshCw size={18} className={rodando ? "animate-spin" : ""} aria-hidden /> {rodando ? "Calculando… pode levar 1 a 2 minutos" : "Calcular agora"}
          </button>
          {msg && <p role="status" className="text-pedra">{msg}</p>}
        </div>
      ) : (
        <>
          {r.verdade[v] !== "observado" && (
            <p className="flex items-start gap-2 rounded-xl border border-barro/50 bg-terra px-3 py-2.5 text-sm">
              <TriangleAlert size={18} className="mt-px shrink-0 text-barro" aria-hidden />
              <span>
                {v === "nuvens"
                  ? "Estação automática não mede nuvens: aqui os modelos são comparados com a estimativa do Open-Meteo. Serve para ver quem se afasta mais, mas não muda os pesos."
                  : inmet
                    ? "O INMET ainda não entregou medições suficientes: por enquanto a comparação é com a estimativa do Open-Meteo, e os pesos ficam iguais."
                    : "Sem o token do INMET, a comparação é com a estimativa do Open-Meteo, não com uma estação. Os pesos ficam iguais e a correção de viés fica desligada até o token entrar."}
              </span>
            </p>
          )}

          <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5" role="group" aria-label="Variável">
            {VARIAVEIS.map((x) => (
              <button
                key={x.id}
                onClick={() => setV(x.id)}
                aria-pressed={v === x.id}
                className={`min-h-11 shrink-0 rounded-full border px-3.5 text-sm font-semibold ${v === x.id ? "border-brotinho bg-brotinho text-breu" : "border-osso/20 bg-sombra text-osso hover:border-osso/40"}`}
              >
                {x.nome}
              </button>
            ))}
          </div>

          <section aria-labelledby="titulo-erro" className="min-w-0">
            <TituloSecao id="titulo-erro" titulo="Erro por antecedência" Icone={LineChart} cor="#62d6d3" />
            <div className="painel mt-2.5 p-3.5">
              {Object.keys(erros).length ? <Grafico erros={erros} unidade={unidade} nomes={nomes} /> : <p className="text-sm text-pedra">Ainda sem comparações para esta variável.</p>}
            </div>
          </section>

          <section aria-labelledby="titulo-tabela" className="min-w-0">
            <TituloSecao id="titulo-tabela" titulo="Erro e peso" Icone={Scale} cor="#a9cb54" />
            <div className="painel mt-2.5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">Erro médio de cada modelo por dias de antecedência, em {unidade}, e peso atual</caption>
                <thead className="text-xs text-pedra">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Modelo</th>
                    {ANTECEDENCIAS.map((a) => (
                      <th key={a} className="px-2 py-2.5 text-right font-semibold">
                        {a}d
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-semibold">Peso 1d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-osso/10 font-mono text-xs">
                  {SERIES.filter((s) => erros[s]).map((s) => {
                    const melhor = (a: number) => {
                      const xs = MODELOS.map((m) => erros[m.id]?.[a]).filter((q): q is number => q != null);
                      return xs.length && erros[s][a] === Math.min(...xs);
                    };
                    return (
                      <tr key={s} className={s === "combinado" ? "bg-osso/[0.04]" : undefined}>
                        <td className="px-3 py-2 font-sans text-sm font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COR_MODELO[s] }} aria-hidden />
                            {s === "combinado" ? "Média ponderada" : nomes[s]}
                          </span>
                        </td>
                        {ANTECEDENCIAS.map((a) => (
                          <td key={a} className={`px-2 py-2 text-right ${s !== "combinado" && melhor(a) ? "font-bold text-brotinho" : ""}`}>
                            {erros[s][a] != null ? fmt(erros[s][a]!, 2) : "–"}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          {s === "combinado" ? "" : s in copias ? "fora" : pesos?.["1"] ? `${Math.round((pesos["1"][s as keyof (typeof pesos)["1"]] ?? 0) * 100)}%` : "igual"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="border-t border-osso/10 px-3 py-2.5 text-xs text-pedra">
                Erro em {unidade}. Em verde, o modelo que mais acertou naquela antecedência. Peso = 1 ÷ erro², só quando a comparação é com estação e há pelo menos 10 dias.
                {Object.keys(copias).length > 0 && " A melhor combinação do Open-Meteo é cópia de outro modelo aqui na Serra, então fica fora da média para não contar duas vezes."}
              </p>
            </div>
          </section>

          {vies.length > 0 && (
            <section aria-labelledby="titulo-vies" className="min-w-0">
              <TituloSecao id="titulo-vies" titulo="Correção de viés" Icone={Info} cor="#f2a93b" />
              <div className="painel mt-2.5 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <caption className="sr-only">Quanto a média dos modelos erra para mais em cada faixa do dia, descontado da previsão</caption>
                  <thead className="text-xs text-pedra">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Ponto</th>
                      {FAIXAS.map((f) => (
                        <th key={f} className="px-2 py-2.5 text-right font-semibold">
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-osso/10 font-mono text-xs">
                    {vies.map(([ponto, porVar]) => (
                      <tr key={ponto}>
                        <td className="px-3 py-2 font-sans text-sm font-semibold">{ESTACOES_INMET.find((e) => e.id === ponto)?.nome ?? ponto}</td>
                        {porVar[v]!.map((x, i) => (
                          <td key={i} className="px-2 py-2 text-right">
                            {x > 0 ? "+" : ""}
                            {fmt(x, 2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-osso/10 px-3 py-2.5 text-xs text-pedra">Positivo: a média dos modelos prevê {unidade === "°C" ? "mais quente" : "mais alto"} do que mediu a estação. Esse valor é descontado da previsão perto de cada ponto.</p>
              </div>
            </section>
          )}

          <p className="text-xs text-pedra">
            Conferido de {r.janela.de.split("-").reverse().join("/")} a {r.janela.ate.split("-").reverse().join("/")}, em faixas de 6 horas, em Lages, São Joaquim e Campos Novos. Dias comparados nesta variável: {r.dias[v]}.{" "}
            <Link href="/fontes" className="font-semibold text-osso/85 underline underline-offset-2">
              Ver as fontes
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => void calcularAgora()} disabled={rodando} className="flex min-h-11 items-center gap-2 rounded-xl border border-osso/25 px-3.5 text-sm font-semibold hover:bg-osso/5 disabled:opacity-60">
              <RefreshCw size={16} className={rodando ? "animate-spin" : ""} aria-hidden /> {rodando ? "Conferindo…" : "Conferir de novo"}
            </button>
            {msg && (
              <span role="status" className="text-sm text-pedra">
                {msg}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
