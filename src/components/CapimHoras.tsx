"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronDown, Clock, Sun, Sunrise, Sunset } from "lucide-react";
import { ESPECIES, LEGENDA_PERIODO, type EspecieId } from "@/config/indice";
import { COR_NOTA, horaTexto } from "@/lib/formato";
import { escala, melhorHora } from "@/lib/indice/calculo";
import type { Astro } from "@/lib/indice/tipos";
import { IconeLua } from "./IconeLua";
import { TituloSecao } from "./TituloSecao";

const L = 480;
const A = 150;
const LARG = L / 24;
const altura = (nota: number) => Math.max(6, (nota / 100) * (A - 10));

/** Cada hora é uma folha de capim: a altura é a nota (eixo fixo de 0 a 100). */
function folha(i: number, nota: number) {
  const x = (i + 0.5) * LARG;
  const h = altura(nota);
  // Curvatura fixa por posição: dá cara de capinzal sem mudar a leitura da altura.
  const dobra = ((i * 7) % 5) - 2;
  const b = LARG * 0.36;
  return `M${x - b} ${A}C${x - b} ${A - h * 0.5} ${x + dobra * 0.4 - 1.5} ${A - h * 0.85} ${x + dobra} ${A - h}C${x + dobra * 0.3 + 2} ${A - h * 0.8} ${x + b} ${A - h * 0.45} ${x + b} ${A}Z`;
}

/** O céu atrás do capim: noite, amanhecer, dia, entardecer, nas horas reais do sol. */
function ceuDoDia(a: Astro): string {
  const nascer = a.nascerSol ?? 6;
  const por = a.porSol ?? 18;
  const p = (h: number) => `${((h / 24) * 100).toFixed(1)}%`;
  return `linear-gradient(90deg, #14233f 0%, #14233f ${p(nascer - 1.2)}, #e58a5f ${p(nascer)}, #6fbfdf ${p(nascer + 1.6)}, #6fbfdf ${p(por - 1.6)}, #f2964e ${p(por)}, #14233f ${p(por + 1.2)}, #14233f 100%)`;
}

export function CapimHoras(p: {
  horas: number[];
  astro: Astro;
  /** Hora atual quando o dia mostrado é hoje. */
  horaAgora: number | null;
  inseguras: number[];
  especie: EspecieId;
}) {
  const { horas, astro, horaAgora, inseguras, especie } = p;
  const melhor = melhorHora(horas, horaAgora ?? 0);
  const [sel, setSel] = useState<number | null>(null);
  const area = useRef<HTMLDivElement>(null);

  // Ao trocar de dia ou espécie, volta a destacar o melhor horário e o capim cresce de novo.
  const assinatura = horas.join();
  useEffect(() => setSel(null), [assinatura]);

  const ativa = sel ?? melhor;
  const nivel = escala(horas[ativa]);

  const moverPara = (e: PointerEvent<HTMLDivElement>) => {
    const r = area.current!.getBoundingClientRect();
    setSel(Math.max(0, Math.min(23, Math.floor(((e.clientX - r.left) / r.width) * 24))));
  };
  const teclado = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setSel(Math.min(23, ativa + 1));
    else if (e.key === "ArrowLeft") setSel(Math.max(0, ativa - 1));
    else return;
    e.preventDefault();
  };

  const pos = (h: number) => `${(h / 24) * 100}%`;
  const meioDia = ((astro.nascerSol ?? 6) + (astro.porSol ?? 18)) / 2;

  return (
    <section className="painel painel-acento revelar p-4" style={{ "--acento": "#f2a93b" } as CSSProperties} aria-labelledby="titulo-horas">
      <TituloSecao id="titulo-horas" titulo="Hora a hora" Icone={Clock} cor="#f2a93b" />
      <p className="mt-2 text-sm text-pedra">
        {ESPECIES[especie].nome}: <span className="font-semibold text-osso">{LEGENDA_PERIODO[ESPECIES[especie].periodo].toLowerCase()}</span>
      </p>

      <p className="mt-2 flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1" aria-live="polite">
        <strong className="font-display text-[2.5rem] font-black leading-none">{String(ativa).padStart(2, "0")}h</strong>
        <span className="rounded-lg px-2 py-0.5 text-sm font-bold text-breu" style={{ backgroundColor: COR_NOTA[nivel.nome] }}>
          {horas[ativa]} · {nivel.nome}
        </span>
        <span className="text-xs text-pedra">{sel === null ? (horaAgora === null ? "Melhor horário" : "Melhor que resta") : "Arraste para ver as outras horas"}</span>
      </p>

      <div
        ref={area}
        role="slider"
        tabIndex={0}
        aria-label="Nota por hora"
        aria-valuemin={0}
        aria-valuemax={23}
        aria-valuenow={ativa}
        aria-valuetext={`${ativa} horas, nota ${horas[ativa]}, ${nivel.nome}`}
        onKeyDown={teclado}
        onPointerDown={moverPara}
        onPointerMove={(e) => (e.buttons || e.pointerType === "mouse") && moverPara(e)}
        className="capim mt-2 cursor-crosshair touch-pan-y select-none"
      >
        <div className="capim-ceu" style={{ backgroundImage: ceuDoDia(astro) }} aria-hidden />
        <span className="pointer-events-none absolute top-1.5 -translate-x-1/2" style={{ left: pos(meioDia) }} aria-hidden>
          <Sun size={18} color="#ffd166" />
        </span>
        <span className="pointer-events-none absolute left-[5%] top-1.5" aria-hidden>
          <IconeLua astro={astro} tam={16} />
        </span>
        <svg viewBox={`0 0 ${L} ${A}`} className="block h-[160px] w-full sm:h-[190px]" preserveAspectRatio="none" aria-hidden>
          <rect x={ativa * LARG} y="0" width={LARG} height={A} fill="rgb(243 240 228 / .12)" />
          <g key={assinatura}>
            {horas.map((nota, i) => {
              const passou = horaAgora !== null && i < horaAgora;
              const insegura = inseguras.includes(i);
              const destaque = i === ativa;
              const cor = insegura ? "#ff5c47" : destaque ? "#f3f0e4" : COR_NOTA[escala(nota).nome];
              return (
                <g key={i} className="lamina-cresce" style={{ "--atraso-cresce": `${i * 22}ms` } as CSSProperties}>
                  <path
                    d={folha(i, nota)}
                    fill={cor}
                    className="lamina"
                    style={{ "--atraso": `${-(i % 6) * 0.45}s`, opacity: passou && !destaque ? 0.38 : 1 } as CSSProperties}
                  />
                </g>
              );
            })}
          </g>
        </svg>
        {horaAgora !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full border-2 border-osso bg-boia"
            style={{ left: `${((horaAgora + 0.5) / 24) * 100}%`, bottom: `calc(${(altura(horas[horaAgora]) / A) * 100}% + 3px)` }}
          />
        )}
      </div>

      {/* O chão: marrom, com o nascer e o pôr do sol marcados. */}
      <div className="rounded-b-xl bg-terra pb-1.5 pt-1.5">
        <div className="relative h-5 text-xs font-medium text-sol">
          {astro.nascerSol !== null && (
            <span className="absolute flex -translate-x-1/2 items-center gap-1 whitespace-nowrap font-mono" style={{ left: pos(astro.nascerSol) }}>
              <Sunrise size={14} aria-hidden /> {horaTexto(astro.nascerSol)}
            </span>
          )}
          {astro.porSol !== null && (
            <span className="absolute flex -translate-x-1/2 items-center gap-1 whitespace-nowrap font-mono" style={{ left: pos(astro.porSol) }}>
              <Sunset size={14} aria-hidden /> {horaTexto(astro.porSol)}
            </span>
          )}
        </div>
        <div className="relative mt-0.5 h-4 font-mono text-xs text-pedra" aria-hidden>
          {[0, 6, 12, 18].map((h) => (
            <span key={h} className="absolute pl-1" style={{ left: pos(h) }}>
              {h}h
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pedra">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-osso" aria-hidden /> Hora escolhida
        </span>
        {horaAgora !== null && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-osso bg-boia" aria-hidden /> Agora
          </span>
        )}
        {inseguras.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[#ff5c47]" aria-hidden /> Perigoso
          </span>
        )}
      </div>

      <details className="mt-1 text-sm">
        <summary className="flex min-h-9 items-center gap-1 text-xs text-pedra">
          Ver em tabela <ChevronDown size={14} className="seta transition-transform" aria-hidden />
        </summary>
        <table className="mt-1 w-full font-mono text-xs">
          <thead>
            <tr className="text-left text-pedra">
              <th className="py-1 font-normal">Hora</th>
              <th className="py-1 font-normal">Nota</th>
              <th className="py-1 font-normal">Classe</th>
            </tr>
          </thead>
          <tbody>
            {horas.map((n, i) => (
              <tr key={i} className="border-t border-osso/5">
                <td className="py-1">{String(i).padStart(2, "0")}h</td>
                <td className="py-1">{n}</td>
                <td className="py-1">{escala(n).nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
