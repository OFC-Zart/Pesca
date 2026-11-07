import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/** Título de seção: ícone colorido, nome grande e uma linha de pesca terminando numa boia. */
export function TituloSecao(p: { id?: string; titulo: string; Icone: LucideIcon; cor: string; lado?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${p.className ?? ""}`} style={{ "--acento": p.cor } as CSSProperties}>
      <span className="icone-chip size-9">
        <p.Icone size={20} aria-hidden />
      </span>
      <h2 id={p.id} className="font-display text-[1.65rem] font-extrabold uppercase leading-none tracking-tight">
        {p.titulo}
      </h2>
      <span className="linha-pesca" aria-hidden />
      {p.lado}
    </div>
  );
}
