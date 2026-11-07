import type { Astro } from "@/lib/indice/tipos";

/** Lua desenhada com a fração iluminada real. No hemisfério sul, a crescente acende pela esquerda. */
export function IconeLua({ astro, tam = 20 }: { astro: Pick<Astro, "iluminacao" | "crescente">; tam?: number }) {
  const r = 10;
  const f = astro.iluminacao;
  const curva = Math.abs(1 - 2 * f) * r;
  const varre = f < 0.5 ? 0 : 1;
  const lado = astro.crescente ? 0 : 1;
  const d = `M12 2A${r} ${r} 0 0 ${lado} 12 22A${curva} ${r} 0 0 ${lado === 0 ? 1 - varre : varre} 12 2Z`;
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r={r} fill="#2a3324" stroke="rgb(236 233 220 / .3)" strokeWidth="1" />
      <path d={d} fill="#ece9dc" />
    </svg>
  );
}
