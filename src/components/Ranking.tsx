import { ChevronRight, Clock } from "lucide-react";
import { ESPECIES, LEGENDA_PERIODO, type EspecieId } from "@/config/indice";
import { COR_NOTA } from "@/lib/formato";
import { escala, fmt, melhorHora, trapezio } from "@/lib/indice/calculo";
import type { DiaPrevisao } from "@/lib/indice/tipos";
import { SeloOrigem } from "./Selos";

export function ordenarEspecies(dia: DiaPrevisao): EspecieId[] {
  const chave = (id: EspecieId) => dia.especies[id].nota ?? Math.round(trapezio(dia.brutos.tempAgua, ESPECIES[id]) * 100);
  return (Object.keys(dia.especies) as EspecieId[]).sort((a, b) => chave(b) - chave(a));
}

export function Ranking({ dia, horaAgora, onEscolher }: { dia: DiaPrevisao; horaAgora: number | null; onEscolher: (id: EspecieId) => void }) {
  const ordem = ordenarEspecies(dia);
  return (
    <section aria-labelledby="titulo-ranking">
      <h2 id="titulo-ranking" className="rotulo mb-2">
        {dia.fase === "tendencia" ? "Água boa para quem" : "O que pescar"}
      </h2>
      <ol className="painel divide-y divide-osso/8 overflow-hidden">
        {ordem.map((id, i) => {
          const e = ESPECIES[id];
          const n = dia.especies[id];
          const nivel = n.nota !== null ? escala(n.nota) : null;
          const horas = n.horas;
          const h = horas ? melhorHora(horas, horaAgora ?? 0) : null;
          // Se o pico do dia já passou, dizer "melhor às 22h" para um peixe diurno enganaria.
          const pico = horas ? melhorHora(horas) : null;
          const picoPassou = horas !== null && h !== null && pico !== null && horas[pico] > horas[h];
          const valor = n.nota ?? Math.round(trapezio(dia.brutos.tempAgua, e) * 100);
          return (
            <li key={id}>
              <button onClick={() => onEscolher(id)} className="flex min-h-[68px] w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-osso/[0.04]">
                <span className="w-4 shrink-0 font-mono text-xs text-pedra">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold">{e.nome}</span>
                    <SeloOrigem id={id} />
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-terra">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${valor}%`, backgroundColor: nivel ? COR_NOTA[nivel.nome] : "#7f9a3f" }}
                    />
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-xs text-pedra">
                    {h !== null ? (
                      <>
                        <Clock size={12} aria-hidden />
                        {picoPassou ? `O pico foi às ${String(pico).padStart(2, "0")}h` : `Melhor às ${String(h).padStart(2, "0")}h`}
                      </>
                    ) : dia.fase === "faixa" ? (
                      LEGENDA_PERIODO[e.periodo]
                    ) : (
                      `Água ${fmt(dia.brutos.tempAgua, 0)} °C · ótimo ${e.otMin}–${e.otMax} °C`
                    )}
                  </span>
                </span>
                {n.nota !== null ? (
                  <span className="text-right">
                    <span className="block font-display text-[2rem] font-black leading-none">{n.nota}</span>
                    <span className="block text-[11px] text-pedra">{nivel?.nome}</span>
                  </span>
                ) : (
                  <span className="font-mono text-sm text-pedra">{valor}%</span>
                )}
                <ChevronRight size={16} className="shrink-0 text-pedra" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
