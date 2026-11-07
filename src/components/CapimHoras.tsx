"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronDown, Sunrise, Sunset } from "lucide-react";
import { COR_NOTA, horaTexto } from "@/lib/formato";
import { escala, melhorHora } from "@/lib/indice/calculo";
import type { Astro } from "@/lib/indice/tipos";

const L = 480;
const A = 150;
const LARG = L / 24;

/** Cada hora é uma folha de capim: a altura é a nota (eixo fixo de 0 a 100). */
function folha(i: number, nota: number) {
  const x = (i + 0.5) * LARG;
  const h = Math.max(6, (nota / 100) * (A - 10));
  // Curvatura fixa por posição: dá cara de capinzal sem mudar a leitura da altura.
  const dobra = ((i * 7) % 5) - 2;
  const b = LARG * 0.34;
  return `M${x - b} ${A}C${x - b} ${A - h * 0.5} ${x + dobra * 0.4 - 1.5} ${A - h * 0.85} ${x + dobra} ${A - h}C${x + dobra * 0.3 + 2} ${A - h * 0.8} ${x + b} ${A - h * 0.45} ${x + b} ${A}Z`;
}

export function CapimHoras(p: {
  horas: number[];
  astro: Astro;
  /** Hora atual quando o dia mostrado é hoje. */
  horaAgora: number | null;
  inseguras: number[];
}) {
  const { horas, astro, horaAgora, inseguras } = p;
  const melhor = melhorHora(horas, horaAgora ?? 0);
  const [sel, setSel] = useState<number | null>(null);
  const area = useRef<HTMLDivElement>(null);

  // Ao trocar de dia ou espécie, volta a destacar o melhor horário.
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

  return (
    <section className="painel p-4" aria-labelledby="titulo-horas">
      <div>
        <h2 id="titulo-horas" className="rotulo">
          Hora a hora
        </h2>
        <p className="mt-1 min-h-6 text-sm" aria-live="polite">
          <span className="text-pedra">{ativa === melhor && sel === null ? (horaAgora === null ? "Melhor horário · " : "Melhor que resta · ") : ""}</span>
          <strong className="font-mono font-medium">{String(ativa).padStart(2, "0")}h</strong>
          <span className="text-pedra"> · nota </span>
          <strong className="font-mono font-medium">{horas[ativa]}</strong>
          <span className="text-pedra"> · {nivel.nome}</span>
        </p>
      </div>

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
        className="mt-3 cursor-crosshair touch-pan-y select-none"
      >
        <svg viewBox={`0 0 ${L} ${A}`} className="block h-[150px] w-full sm:h-[180px]" preserveAspectRatio="none" aria-hidden>
          <rect x={ativa * LARG} y="0" width={LARG} height={A} fill="rgb(236 233 220 / .06)" />
          {horas.map((nota, i) => {
            const passou = horaAgora !== null && i < horaAgora;
            const insegura = inseguras.includes(i);
            const destaque = i === ativa;
            const cor = insegura ? "#de4331" : destaque ? "#ece9dc" : i === melhor ? "#c9e96b" : COR_NOTA[escala(nota).nome];
            return (
              <path
                key={i}
                d={folha(i, nota)}
                fill={cor}
                className="lamina"
                style={{ "--atraso": `${(i % 6) * 0.45}s`, opacity: passou && !destaque ? 0.35 : 1 } as CSSProperties}
              />
            );
          })}
          {horaAgora !== null && (
            <circle cx={(horaAgora + 0.5) * LARG} cy={A - Math.max(6, (horas[horaAgora] / 100) * (A - 10)) - 7} r="4.5" fill="#de4331" stroke="#ece9dc" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
      </div>

      {/* O chão: marrom, com o nascer e o pôr do sol marcados. */}
      <div className="rounded-b-md bg-terra px-0 pb-1.5 pt-1.5">
        <div className="relative h-5 text-[11px] text-barro">
          {astro.nascerSol !== null && (
            <span className="absolute flex -translate-x-1/2 items-center gap-1 whitespace-nowrap font-mono" style={{ left: pos(astro.nascerSol) }}>
              <Sunrise size={13} aria-hidden /> {horaTexto(astro.nascerSol)}
            </span>
          )}
          {astro.porSol !== null && (
            <span className="absolute flex -translate-x-1/2 items-center gap-1 whitespace-nowrap font-mono" style={{ left: pos(astro.porSol) }}>
              <Sunset size={13} aria-hidden /> {horaTexto(astro.porSol)}
            </span>
          )}
        </div>
        <div className="relative h-4 font-mono text-[10px] text-pedra/80" aria-hidden>
          {[0, 6, 12, 18].map((h) => (
            <span key={h} className="absolute pl-1" style={{ left: pos(h) }}>
              {h}h
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pedra">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brotinho" aria-hidden /> {horaAgora === null ? "Melhor horário" : "Melhor que resta"}
        </span>
        {horaAgora !== null && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-osso bg-boia" aria-hidden /> Agora
          </span>
        )}
        {inseguras.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-boia" aria-hidden /> Perigoso
          </span>
        )}
      </div>

      <details className="mt-2 text-sm">
        <summary className="flex items-center gap-1 py-1 text-xs text-pedra">
          Ver em tabela <ChevronDown size={14} className="seta transition-transform" aria-hidden />
        </summary>
        <table className="mt-2 w-full font-mono text-xs">
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
