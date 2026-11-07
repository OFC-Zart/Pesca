import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

export function TituloPagina({ titulo, sub, Icone, cor = "#a9cb54" }: { titulo: string; sub?: string; Icone?: LucideIcon; cor?: string }) {
  return (
    <header className="mb-6" style={{ "--acento": cor } as CSSProperties}>
      <div className="flex items-center gap-3">
        {Icone && (
          <span className="icone-chip size-12">
            <Icone size={26} aria-hidden />
          </span>
        )}
        <h1 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-tight">{titulo}</h1>
      </div>
      <svg viewBox="0 0 200 8" width="200" height="8" className="mt-2" aria-hidden>
        <path d="M1 4q12-6 25 0t25 0 25 0 25 0 25 0 25 0 25 0 24 0" fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {sub && <p className="mt-2 max-w-2xl text-osso/85">{sub}</p>}
    </header>
  );
}
