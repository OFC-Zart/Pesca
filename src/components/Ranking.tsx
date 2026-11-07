import { ChevronRight, Clock, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { ESPECIES, LEGENDA_PERIODO, type EspecieId } from "@/config/indice";
import { COR_NOTA } from "@/lib/formato";
import { escala, fmt, melhorHora, trapezio } from "@/lib/indice/calculo";
import type { DiaPrevisao } from "@/lib/indice/tipos";
import { COR_ESPECIE } from "@/lib/visual";
import { PeixeEspecie } from "./Peixes";
import { SeloOrigem } from "./Selos";
import { TituloSecao } from "./TituloSecao";

export function ordenarEspecies(dia: DiaPrevisao): EspecieId[] {
  const chave = (id: EspecieId) => dia.especies[id].nota ?? Math.round(trapezio(dia.brutos.tempAgua, ESPECIES[id]) * 100);
  return (Object.keys(dia.especies) as EspecieId[]).sort((a, b) => chave(b) - chave(a));
}

const MEDALHA = ["#ffd166", "#d5dce2", "#dd9f68"];

export function Ranking({ dia, horaAgora, onEscolher }: { dia: DiaPrevisao; horaAgora: number | null; onEscolher: (id: EspecieId) => void }) {
  const ordem = ordenarEspecies(dia);
  return (
    <section className="revelar" aria-labelledby="titulo-ranking">
      <TituloSecao id="titulo-ranking" titulo={dia.fase === "tendencia" ? "Água boa para quem" : "O que pescar"} Icone={Trophy} cor="#ffd166" />
      <ol className="painel mt-2.5 divide-y divide-osso/10 overflow-hidden">
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
          const corBarra = nivel ? COR_NOTA[nivel.nome] : "#62d6d3";
          return (
            <li key={id} className="aparece" style={{ "--i": i } as CSSProperties}>
              <button onClick={() => onEscolher(id)} className="flex min-h-[78px] w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-osso/[0.05]">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full font-display text-base font-extrabold ${i > 2 ? "bg-folha text-pedra" : "text-breu"}`}
                  style={i <= 2 ? { backgroundColor: MEDALHA[i] } : undefined}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <PeixeEspecie cor={COR_ESPECIE[id]} />
                    <span className="font-semibold">{e.nome}</span>
                    <SeloOrigem id={id} />
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-terra">
                    <span key={dia.data} className="barra block h-full rounded-full" style={{ width: `${valor}%`, backgroundColor: corBarra, "--i": i } as CSSProperties} />
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-xs text-pedra">
                    {h !== null ? (
                      <>
                        <Clock size={13} aria-hidden />
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
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-[2.1rem] font-black leading-none">{n.nota}</span>
                    <span className="block text-xs font-semibold" style={{ color: corBarra }}>
                      {nivel?.nome}
                    </span>
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-sm text-pedra">{valor}%</span>
                )}
                <ChevronRight size={18} className="shrink-0 text-pedra" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
