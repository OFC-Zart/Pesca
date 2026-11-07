import type { CSSProperties } from "react";
import { TEXTO_CONFIANCA } from "@/lib/formato";
import type { NivelConfianca } from "@/lib/indice/tipos";

const PEIXE = "M1.5 12c4-6.2 11.2-7.2 16.2-2.2L22.5 6v12l-4.8-3.8C12.7 19.2 5.5 18.2 1.5 12z";

/** Peixe da nota: cheio conta, vazio é o que faltou para 5. */
export function Peixe({ cheio, atraso = 0, tam = 26, cor = "#c9e96b" }: { cheio: boolean; atraso?: number; tam?: number; cor?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tam}
      height={tam}
      aria-hidden
      className={cheio ? "peixe" : undefined}
      style={{ "--atraso": `${atraso}s` } as CSSProperties}
    >
      <path d={PEIXE} fill={cheio ? cor : "none"} stroke={cheio ? cor : "rgb(243 240 228 / .4)"} strokeWidth="1.4" strokeLinejoin="round" />
      {cheio && <circle cx="6.6" cy="10.8" r="1.2" fill="#10160e" />}
    </svg>
  );
}

/** Marca de cada espécie: o mesmo peixinho, na cor dela. */
export function PeixeEspecie({ cor, tam = 20 }: { cor: string; tam?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} aria-hidden className="shrink-0">
      <path d={PEIXE} fill={cor} />
      <circle cx="6.6" cy="10.8" r="1.3" fill="#10160e" />
      <path d="M11.5 8.6c1.4 2 1.4 4.8 0 6.8" fill="none" stroke="#10160e" strokeOpacity=".3" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

const QUANTOS: Record<NivelConfianca, number> = { alta: 4, media: 3, baixa: 2 };

/** Confiança da previsão do tempo em peixinhos azuis: 4 alta, 3 média, 2 baixa. */
export function CardumeConfianca({ nivel, tam = 16 }: { nivel: NivelConfianca; tam?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-px" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <Peixe key={i} cheio={i < QUANTOS[nivel]} atraso={i * 0.3} tam={tam} cor="#62d6d3" />
      ))}
    </span>
  );
}

export function Confianca({ nivel }: { nivel: NivelConfianca }) {
  return (
    <span className="flex items-center gap-2 text-xs text-pedra">
      <CardumeConfianca nivel={nivel} tam={18} />
      <span>
        Confiança da previsão do tempo: <strong className="font-semibold text-osso">{TEXTO_CONFIANCA[nivel]}</strong>
      </span>
    </span>
  );
}
