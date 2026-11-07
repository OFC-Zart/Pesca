import { ShieldAlert } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { COR_NOTA, TEXTO_CONFIANCA } from "@/lib/formato";
import { escala } from "@/lib/indice/calculo";
import type { NivelConfianca } from "@/lib/indice/tipos";

const PEIXE = "M1.5 12c4-6.2 11.2-7.2 16.2-2.2L22.5 6v12l-4.8-3.8C12.7 19.2 5.5 18.2 1.5 12z";

export function Peixe({ cheio, atraso = 0, tam = 26 }: { cheio: boolean; atraso?: number; tam?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tam}
      height={tam}
      aria-hidden
      className={cheio ? "peixe" : undefined}
      style={{ "--atraso": `${atraso}s` } as CSSProperties}
    >
      <path d={PEIXE} fill={cheio ? "#c9e96b" : "none"} stroke={cheio ? "#c9e96b" : "rgb(236 233 220 / .28)"} strokeWidth="1.4" strokeLinejoin="round" />
      {cheio && <circle cx="6.6" cy="10.8" r="1.1" fill="#11170f" />}
    </svg>
  );
}

export function Bolinhas({ nivel }: { nivel: NivelConfianca }) {
  const cheias = nivel === "alta" ? 4 : nivel === "media" ? 3 : 2;
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`size-[7px] rounded-full ${i < cheias ? "bg-osso" : "border border-osso/40"}`} />
      ))}
    </span>
  );
}

export function Confianca({ nivel }: { nivel: NivelConfianca }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-pedra">
      <Bolinhas nivel={nivel} />
      Confiança da previsão do tempo: {TEXTO_CONFIANCA[nivel]}
    </span>
  );
}

/** A boia afunda e puxa mais quanto melhor a nota; o número de ondas e de peixes acompanha a escala. */
function Boia({ nota }: { nota: number | null }) {
  const n = nota ?? 12;
  const estilo = {
    "--mergulho": `${8 + n * 0.62}px`,
    "--inclina": `${2 + n * 0.14}deg`,
    "--ritmo": `${Math.max(1.5, 5 - n * 0.035)}s`,
    "--amplitude": `${3 + n * 0.08}px`,
  } as CSSProperties;
  const ondas = nota === null ? 1 : escala(nota).peixes;
  return (
    <div style={estilo} aria-hidden>
      <svg className="boia" viewBox="0 0 58 400" style={{ height: 400 }} preserveAspectRatio="xMidYMax meet">
        <path d="M29 0V300" stroke="rgb(236 233 220 / .3)" strokeWidth="1" />
        <path d="M29 280v20" stroke="#ece9dc" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M29 296c15 0 25 14 25 32H4c0-18 10-32 25-32z" fill="#de4331" />
        <path d="M9 304a10 26 0 0 0-3 20" stroke="rgb(255 255 255 / .35)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="4" y="328" width="50" height="9" fill="#ece9dc" />
        <path d="M4 337h50c0 18-11 42-25 63C15 379 4 355 4 337z" fill="#5f7f3a" />
      </svg>
      {Array.from({ length: ondas }, (_, i) => (
        <span key={i} className="onda" style={{ "--atraso": `${(i * 4) / Math.max(ondas, 1) / 2}s` } as CSSProperties} />
      ))}
    </div>
  );
}

export function CenaBoia(p: {
  kicker: ReactNode;
  titulo: string;
  selos?: ReactNode;
  nota: number | null;
  min?: number | null;
  max?: number | null;
  motivo: string;
  confianca?: NivelConfianca;
  bloqueio?: string | null;
  rodape?: ReactNode;
}) {
  const nivel = p.nota === null ? null : escala(p.nota);
  return (
    <section className="cena aparece" aria-label={`Nota de ${p.titulo}`}>
      <div className="relative z-10 flex min-h-[388px] flex-col p-5 pb-[112px] sm:min-h-[420px]">
        <p className="rotulo">{p.kicker}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h1 className="font-display text-[2.1rem] font-extrabold uppercase leading-none tracking-tight">{p.titulo}</h1>
          {p.selos}
        </div>

        {p.bloqueio && (
          <p className="mt-3 flex max-w-[78%] items-start gap-2 rounded-lg border border-boia bg-sangue px-3 py-2 text-sm font-semibold">
            <ShieldAlert size={18} className="mt-px shrink-0 text-boia-clara" aria-hidden />
            <span>
              Não recomendado – segurança
              <span className="block font-normal text-osso/80">{p.bloqueio}</span>
            </span>
          </p>
        )}

        {nivel && p.nota !== null ? (
          <div className="mt-2">
            <div className="flex items-end gap-3">
              <span className={`font-display text-[8.5rem] font-black leading-[0.82] tracking-tight sm:text-[10rem] ${p.bloqueio ? "opacity-40" : ""}`}>
                {p.nota}
              </span>
              <span className="pb-3">
                <span
                  className="block rounded px-2 py-0.5 text-sm font-bold text-breu"
                  style={{ backgroundColor: COR_NOTA[nivel.nome] }}
                >
                  {nivel.nome}
                </span>
                {p.min != null && p.max != null && (
                  <span className="mt-1 block font-mono text-xs text-pedra">
                    {p.min}–{p.max}
                  </span>
                )}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-4 font-display text-6xl font-black uppercase leading-none text-pedra">Tendência</p>
        )}

        <p className="mt-3 max-w-[74%] text-[15px] leading-snug text-osso/90">{p.motivo}</p>
        {p.confianca && (
          <p className="mt-2 max-w-[74%]">
            <Confianca nivel={p.confianca} />
          </p>
        )}
        {p.rodape}
      </div>

      <Boia nota={p.nota} />

      <div className="agua flex items-end justify-between px-5 pb-3.5">
        {nivel ? (
          <div className="flex items-center gap-1.5" role="img" aria-label={`${nivel.peixes} de 5 peixes`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Peixe key={i} cheio={i <= nivel.peixes} atraso={i * 0.35} />
            ))}
          </div>
        ) : (
          <span className="rotulo">Só lua e água</span>
        )}
      </div>
    </section>
  );
}
