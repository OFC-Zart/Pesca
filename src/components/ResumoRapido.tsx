import { Clock, Thermometer, Wind, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ESPECIES, type EspecieId, type Periodo } from "@/config/indice";
import { fmt, melhorHora } from "@/lib/indice/calculo";
import type { DiaPrevisao } from "@/lib/indice/tipos";
import { IconeLua } from "./IconeLua";

const PERIODO_CURTO: Record<Periodo, string> = {
  diurno: "De dia",
  noturno: "À noite",
  crepuscular: "Sol baixo",
  misto: "O dia todo",
};

function Ficha(p: { rotulo: string; valor: string; cor: string; Icone?: LucideIcon; icone?: ReactNode; i: number }) {
  return (
    <div className="ficha aparece flex items-center gap-2.5 p-2.5" style={{ "--acento": p.cor, "--i": p.i } as CSSProperties}>
      <span className="icone-chip size-9">{p.Icone ? <p.Icone size={19} aria-hidden /> : p.icone}</span>
      <span className="min-w-0">
        <span className="block font-display text-[1.45rem] font-extrabold leading-none">{p.valor}</span>
        <span className="mt-0.5 block text-xs text-pedra">{p.rotulo}</span>
      </span>
    </div>
  );
}

/** O essencial do dia em quatro fichas, antes dos detalhes. */
export function ResumoRapido({ dia, especie, horaAgora }: { dia: DiaPrevisao; especie: EspecieId; horaAgora: number | null }) {
  const horas = dia.especies[especie].horas;
  const b = dia.brutos;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2" aria-label="Resumo do dia" role="group">
      {horas ? (
        <Ficha i={0} cor="#f2a93b" Icone={Clock} rotulo={horaAgora === null ? "Melhor hora" : "Melhor que resta"} valor={`${String(melhorHora(horas, horaAgora ?? 0)).padStart(2, "0")}h`} />
      ) : (
        <Ficha i={0} cor="#f2a93b" Icone={Clock} rotulo="Melhor período" valor={PERIODO_CURTO[ESPECIES[especie].periodo]} />
      )}
      <Ficha i={1} cor="#62d6d3" Icone={Thermometer} rotulo="Água estimada" valor={`${fmt(b.tempAgua)} °C`} />
      <Ficha i={2} cor="#86ccf0" Icone={Wind} rotulo="Vento médio" valor={`${fmt(b.vento)} m/s`} />
      <Ficha i={3} cor="#ffe6a0" icone={<IconeLua astro={dia.astro} tam={22} />} rotulo="Lua iluminada" valor={`${Math.round(dia.astro.iluminacao * 100)}%`} />
    </div>
  );
}
