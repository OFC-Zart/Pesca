"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { CalendarRange, ShieldAlert } from "lucide-react";
import { diaMes, diaSemana, COR_NOTA, TEXTO_CONFIANCA } from "@/lib/formato";
import { fmt, escala } from "@/lib/indice/calculo";
import type { DiaPrevisao } from "@/lib/indice/tipos";
import { IconeLua } from "./IconeLua";
import { IconeTempo } from "./IconeTempo";
import { CardumeConfianca, Peixe } from "./Peixes";
import { TituloSecao } from "./TituloSecao";

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
    <section className="revelar" aria-labelledby="titulo-dias">
      <TituloSecao id="titulo-dias" titulo="Próximos dias" Icone={CalendarRange} cor="#62d6d3" />
      <div ref={trilho} className="sem-barra borda-fade -mx-4 mt-1.5 flex snap-x gap-2 overflow-x-auto scroll-pl-4 px-4 pb-1 pt-3">
        {p.dias.map(({ dia, nota, min, max }, i) => {
          const sel = dia.data === p.selecionado;
          const tendencia = dia.fase === "tendencia";
          const nivel = nota !== null ? escala(nota) : null;
          const cor = nivel ? COR_NOTA[nivel.nome] : "#80857a";
          return (
            <button
              key={dia.data}
              ref={sel ? ativo : undefined}
              onClick={() => p.onSelecionar(dia.data)}
              aria-pressed={sel}
              aria-label={
                tendencia
                  ? `${diaSemana(dia.data)}, tendência, água ${fmt(dia.brutos.tempAgua, 0)} graus`
                  : `${dia.data === p.hoje ? "Hoje" : diaSemana(dia.data)}, nota ${nota}, de ${min} a ${max}, confiança ${TEXTO_CONFIANCA[dia.confianca]}${dia.bloqueio ? ", não recomendado" : ""}`
              }
              style={{ "--i": Math.min(i, 8), borderTopColor: cor } as CSSProperties}
              className={`aparece relative flex min-h-[148px] w-[98px] shrink-0 snap-start flex-col rounded-2xl border border-t-4 p-2.5 text-left transition-[translate] ${
                sel ? "-translate-y-1 border-x-osso/50 border-b-osso/50 bg-folha" : `border-x-osso/10 border-b-osso/10 bg-sombra hover:bg-folha/70 ${tendencia ? "opacity-80" : ""}`
              }`}
            >
              {dia.data === melhor && (
                <span className="absolute -top-3 right-1.5 rounded-md bg-ambar px-1.5 py-px text-[11px] font-bold text-breu">Melhor</span>
              )}
              <span className="flex items-start justify-between gap-1">
                <span className="text-sm font-bold capitalize leading-tight">{dia.data === p.hoje ? "Hoje" : diaSemana(dia.data)}</span>
                <IconeTempo brutos={dia.brutos} />
              </span>
              <span className="font-mono text-xs text-pedra">{diaMes(dia.data)}</span>

              {tendencia ? (
                <>
                  <span className="mt-2 flex items-center gap-1.5">
                    <IconeLua astro={dia.astro} tam={20} />
                    <span className="font-display text-2xl font-extrabold leading-none">{fmt(dia.brutos.tempAgua, 0)}°</span>
                  </span>
                  <span className="mt-1 text-xs text-pedra">água</span>
                  <span className="mt-auto rounded-md border border-osso/25 px-1 py-px text-center text-[11px] font-medium text-pedra">Tendência</span>
                </>
              ) : (
                <>
                  <span className={`mt-1 flex items-center gap-1 font-display text-[2.6rem] font-black leading-none ${dia.bloqueio ? "text-boia-clara" : ""}`}>
                    {nota}
                    {dia.bloqueio && <ShieldAlert size={16} className="text-boia-clara" aria-hidden />}
                  </span>
                  <span className="mt-0.5 text-xs text-pedra">
                    {min}–{max}
                  </span>
                  <span className="mt-auto pt-1.5">
                    <CardumeConfianca nivel={dia.confianca} tam={17} />
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-pedra">
        <span className="shrink-0">
          <Peixe cheio tam={16} cor="#62d6d3" />
        </span>
        <span>Peixinhos azuis: confiança da previsão do tempo. 4 é alta, 3 é média, 2 é baixa.</span>
      </p>
    </section>
  );
}
