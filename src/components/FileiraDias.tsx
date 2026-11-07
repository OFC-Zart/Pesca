"use client";

import { useEffect, useRef } from "react";
import { diaMes, diaSemana, COR_NOTA } from "@/lib/formato";
import { fmt, escala } from "@/lib/indice/calculo";
import type { DiaPrevisao } from "@/lib/indice/tipos";
import { Bolinhas } from "./CenaBoia";
import { IconeLua } from "./IconeLua";

export interface ResumoDia {
  dia: DiaPrevisao;
  nota: number | null;
  min: number | null;
  max: number | null;
}

export function FileiraDias(p: { dias: ResumoDia[]; selecionado: string; hoje: string; onSelecionar: (data: string) => void }) {
  const notas = p.dias.filter((d) => d.nota !== null && !d.dia.bloqueio);
  const melhor = notas.reduce<ResumoDia | null>((m, d) => (!m || d.nota! > m.nota! ? d : m), null)?.dia.data;
  const ativo = useRef<HTMLButtonElement>(null);
  const trilho = useRef<HTMLDivElement>(null);

  // Rola só a fileira, nunca a página: mantém o dia escolhido à vista.
  useEffect(() => {
    const t = trilho.current;
    const a = ativo.current;
    if (!t || !a) return;
    const esquerda = a.offsetLeft - t.offsetLeft;
    if (esquerda < t.scrollLeft || esquerda + a.offsetWidth > t.scrollLeft + t.clientWidth) {
      t.scrollTo({ left: esquerda - 16, behavior: "smooth" });
    }
  }, [p.selecionado]);

  return (
    <section aria-labelledby="titulo-dias">
      <h2 id="titulo-dias" className="rotulo mb-2">
        Próximos dias
      </h2>
      <div ref={trilho} className="sem-barra -mx-4 flex snap-x gap-2 overflow-x-auto scroll-pl-4 px-4 pb-1 pt-2.5">
        {p.dias.map(({ dia, nota, min, max }, i) => {
          const sel = dia.data === p.selecionado;
          const tendencia = dia.fase === "tendencia";
          const nivel = nota !== null ? escala(nota) : null;
          return (
            <button
              key={dia.data}
              ref={sel ? ativo : undefined}
              onClick={() => p.onSelecionar(dia.data)}
              aria-pressed={sel}
              style={{ opacity: sel ? 1 : tendencia ? 0.62 : Math.max(0.78, 1 - i * 0.03) }}
              className={`relative flex min-h-[132px] w-[88px] shrink-0 snap-start flex-col rounded-xl border p-2.5 text-left transition-colors ${
                sel ? "border-brotinho bg-folha" : "border-osso/10 bg-sombra/85 hover:border-osso/30"
              }`}
            >
              {dia.data === melhor && (
                <span className="absolute -top-2 left-2 rounded bg-boia px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-wider text-white">
                  Melhor
                </span>
              )}
              <span className="text-xs font-semibold capitalize">{dia.data === p.hoje ? "Hoje" : diaSemana(dia.data)}</span>
              <span className="font-mono text-[11px] text-pedra">{diaMes(dia.data)}</span>

              {tendencia ? (
                <>
                  <span className="mt-2 flex items-center gap-1.5">
                    <IconeLua astro={dia.astro} tam={18} />
                    <span className="font-mono text-xs">{fmt(dia.brutos.tempAgua, 0)}°</span>
                  </span>
                  <span className="mt-auto rounded border border-osso/20 px-1 py-px text-center font-mono text-[9px] uppercase tracking-wide text-pedra">
                    Tendência
                  </span>
                </>
              ) : (
                <>
                  <span className={`mt-1 font-display text-[2.4rem] font-black leading-none ${dia.bloqueio ? "text-boia-clara" : ""}`}>{nota}</span>
                  {nivel && <span className="mt-0.5 h-1 w-8 rounded-full" style={{ backgroundColor: COR_NOTA[nivel.nome] }} aria-hidden />}
                  <span className="mt-1 font-mono text-[10px] text-pedra">
                    {min}–{max}
                  </span>
                  <span className="mt-auto pt-1" role="img" aria-label={`Confiança ${dia.confianca}`}>
                    <Bolinhas nivel={dia.confianca} />
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
