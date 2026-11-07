import { CalendarDays, ShieldAlert } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { COR_NOTA } from "@/lib/formato";
import { quantasNuvens, type Momento } from "@/lib/cena";
import { escala } from "@/lib/indice/calculo";
import type { Astro, NivelConfianca } from "@/lib/indice/tipos";
import { Contador } from "./Contador";
import { IconeLua } from "./IconeLua";
import { Onda, Serra, Taboas } from "./Paisagem";
import { Confianca, Peixe } from "./Peixes";

const PEIXE = "M1.5 12c4-6.2 11.2-7.2 16.2-2.2L22.5 6v12l-4.8-3.8C12.7 19.2 5.5 18.2 1.5 12z";

const NUVENS = [
  { topo: "10%", dur: "86s", atraso: "-30s", largura: 64 },
  { topo: "25%", dur: "120s", atraso: "-85s", largura: 46 },
  { topo: "4%", dur: "150s", atraso: "-12s", largura: 54 },
];
const ESTRELAS = [[8, 12], [17, 30], [26, 9], [34, 24], [43, 14], [52, 32], [61, 8], [70, 22], [79, 11], [90, 28], [12, 40], [57, 42]];
const NADADORES = [
  { topo: 22, tam: 24, dur: "19s", atraso: "-4s", volta: false },
  { topo: 46, tam: 17, dur: "27s", atraso: "-15s", volta: true },
  { topo: 34, tam: 13, dur: "34s", atraso: "-24s", volta: false },
];
const BOLHAS = [
  { esq: "62%", tam: "5px", dur: "4.6s", atraso: "0s" },
  { esq: "71%", tam: "3px", dur: "6s", atraso: "-2s" },
  { esq: "46%", tam: "4px", dur: "5.4s", atraso: "-3.4s" },
  { esq: "88%", tam: "4px", dur: "7s", atraso: "-1s" },
];
const VAGALUMES = [
  { esq: "9%", topo: "40%", dur: "6s", atraso: "0s" },
  { esq: "22%", topo: "26%", dur: "8s", atraso: "-3s" },
  { esq: "37%", topo: "44%", dur: "7s", atraso: "-5s" },
  { esq: "91%", topo: "34%", dur: "9s", atraso: "-2s" },
];

/** A boia afunda e puxa mais quanto melhor a nota; ondas e saltos acompanham a escala. */
function Boia({ nota }: { nota: number | null }) {
  const n = nota ?? 12;
  const ondas = nota === null ? 1 : escala(nota).peixes;
  const estilo = {
    "--mergulho": `${5 + n * 0.3}px`,
    "--inclina": `${2 + n * 0.1}deg`,
    "--ritmo": `${Math.max(2, 5 - n * 0.03)}s`,
    "--amplitude": `${2.5 + n * 0.04}px`,
    "--ciclo-fisgada": `${Math.max(6, 14 - n * 0.08)}s`,
  } as CSSProperties;
  return (
    <div style={estilo}>
      <div className="boia">
        <svg className="boia-corpo" viewBox="0 0 44 190" width="44" height="190">
          <path d="M22 0V122" stroke="rgb(243 240 228 / .55)" strokeWidth="1" />
          <path d="M22 106v18" stroke="#f3f0e4" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 120c11 0 19 11 19 25H3c0-14 8-25 19-25z" fill="#de4331" />
          <path d="M9 127a8 20 0 0 0-2 15" stroke="rgb(255 255 255 / .45)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <rect x="3" y="145" width="38" height="7" fill="#f3f0e4" />
          <path d="M3 152h38c0 14-8 26-19 38C11 178 3 166 3 152z" fill="#6c9630" />
        </svg>
      </div>
      {Array.from({ length: ondas }, (_, i) => (
        <span key={i} className="onda" style={{ "--atraso": `${(i * 2) / Math.max(ondas, 1)}s` } as CSSProperties} />
      ))}
    </div>
  );
}

function Libelula() {
  return (
    <svg className="libelula" viewBox="0 0 26 18" width="26" height="18" aria-hidden>
      <path d="M2 10.5H22" stroke="#1b4f62" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="21.5" cy="10" r="2.2" fill="#1b4f62" />
      <g className="asa" fill="rgb(235 250 255 / .85)" stroke="#1b4f62" strokeWidth=".35">
        <ellipse cx="15.5" cy="5.5" rx="2" ry="5" transform="rotate(14 15.5 5.5)" />
        <ellipse cx="11.5" cy="5.5" rx="1.8" ry="5" transform="rotate(-14 11.5 5.5)" />
      </g>
    </svg>
  );
}

export interface DadosCenario {
  momento: Momento;
  /** Sol ou lua no céu, em % do cartão. */
  posicao: { esquerda: number; topo: number; deNoite: boolean };
  astro: Pick<Astro, "iluminacao" | "crescente">;
  nuvens: number;
  chuva48h: number;
}

function CenarioRio({ nota, cenario }: { nota: number | null; cenario: DadosCenario }) {
  const { momento, posicao, astro, nuvens, chuva48h } = cenario;
  const noite = momento === "noite";
  // Com chuva o céu fecha: sem sol à mostra e com o máximo de nuvens.
  const chovendo = chuva48h > 15;
  const nivel = nota === null ? null : escala(nota);
  // Só pula peixe em dia a partir de "Bom"; quanto melhor a nota, mais vezes.
  const cicloSalto = nivel && nivel.peixes >= 3 ? `${16 - nivel.peixes * 2}s` : null;

  return (
    <div className="rio" data-momento={momento} data-chuva={chovendo ? "sim" : undefined}>
      <div className="rio-ceu" aria-hidden>
        {noite &&
          !chovendo &&
          ESTRELAS.map(([x, y], i) => (
            <span key={i} className="estrela" style={{ left: `${x}%`, top: `${y}%`, "--atraso": `${-i * 0.6}s` } as CSSProperties} />
          ))}
        {!chovendo && (
          <span className="astro" style={{ left: `${posicao.esquerda}%`, top: `${posicao.topo}%` }}>
            {posicao.deNoite ? (
              <span className="lua block">
                <IconeLua astro={astro} tam={30} />
              </span>
            ) : (
              <span className="sol block" />
            )}
          </span>
        )}
        {NUVENS.slice(0, chovendo ? 3 : quantasNuvens(nuvens)).map((n) => (
          <svg
            key={n.dur}
            className="nuvem"
            viewBox="0 0 64 24"
            width={n.largura}
            style={{ top: n.topo, "--dur": n.dur, "--atraso": n.atraso } as CSSProperties}
            aria-hidden
          >
            <path d="M12 24a10 10 0 0 1-1-19.9A14 14 0 0 1 37 6a10 10 0 0 1 15 7 6 6 0 0 1 0 11z" />
          </svg>
        ))}
      </div>

      <Serra className="rio-serra" />
      {chovendo && <div className="chuva" aria-hidden />}

      <div aria-hidden>
        <Boia nota={nota} />
        {cicloSalto && (
          <>
            <svg className="salto" viewBox="0 0 24 24" width="26" height="26" style={{ "--ciclo": cicloSalto } as CSSProperties}>
              <path d={PEIXE} fill="#e6edd8" stroke="#2f5d5f" strokeWidth=".8" />
              <circle cx="6.6" cy="10.8" r="1.2" fill="#10160e" />
            </svg>
            <span className="respingo" style={{ "--ciclo": cicloSalto } as CSSProperties} />
          </>
        )}
      </div>

      <div className="rio-agua" aria-hidden>
        {!chovendo && <span className="reflexo" style={{ left: `${posicao.esquerda}%` }} />}
        <Onda cor="rgb(120 225 215 / .5)" />
        <Onda cor="rgb(225 250 240 / .4)" className="volta" />
        {NADADORES.map((n, i) => (
          <svg
            key={i}
            className={`nadador ${n.volta ? "volta" : ""}`}
            viewBox="0 0 24 24"
            width={n.tam}
            height={n.tam}
            style={{ top: n.topo, "--dur": n.dur, "--atraso": n.atraso, "--sentido": n.volta ? 1 : -1 } as CSSProperties}
          >
            <path d={PEIXE} fill="rgb(3 26 30 / .62)" />
          </svg>
        ))}
        {BOLHAS.map((b) => (
          <span key={b.esq} className="bolha" style={{ left: b.esq, "--tam": b.tam, "--dur": b.dur, "--atraso": b.atraso } as CSSProperties} />
        ))}
        <svg className="aguape" viewBox="0 0 40 10" width="40" height="10" style={{ left: "36%" }}>
          <ellipse cx="14" cy="6" rx="13" ry="3.6" fill="#3c7a3a" />
          <ellipse cx="31" cy="6.5" rx="8.5" ry="2.6" fill="#4f9347" />
          <circle cx="14" cy="4" r="2.4" fill="#ff9ec4" />
          <circle cx="14" cy="4" r="1" fill="#ffd166" />
        </svg>
      </div>

      <Taboas className="taboa" style={{ left: "-4px" }} />
      <Taboas className="taboa" style={{ right: "-8px", animationDelay: "-2s", transform: "scaleX(-1)" }} />

      {(momento === "dia" || momento === "amanhecer") && !chovendo && <Libelula />}
      {(noite || momento === "entardecer") &&
        !chovendo &&
        VAGALUMES.map((v) => (
          <span key={v.esq} aria-hidden className="vagalume" style={{ left: v.esq, top: v.topo, "--dur": v.dur, "--atraso": v.atraso } as CSSProperties} />
        ))}

      {nivel ? (
        <div className="placar" role="img" aria-label={`${nivel.peixes} de 5 peixes`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Peixe key={i} cheio={i <= nivel.peixes} atraso={i * 0.35} />
          ))}
        </div>
      ) : (
        <span className="placar rotulo text-osso">Só lua e água</span>
      )}
    </div>
  );
}

export function CenaRio(p: {
  kicker: ReactNode;
  titulo: string;
  selos?: ReactNode;
  cor: string;
  nota: number | null;
  min?: number | null;
  max?: number | null;
  motivo: string;
  confianca?: NivelConfianca;
  bloqueio?: string | null;
  rodape?: ReactNode;
  cenario: DadosCenario;
}) {
  const nivel = p.nota === null ? null : escala(p.nota);
  return (
    <section className="cena aparece" style={{ "--acento": p.cor } as CSSProperties} aria-label={`Nota de ${p.titulo}`}>
      <div className="p-4 sm:p-5">
        <p className="rotulo flex items-center gap-1.5">
          <CalendarDays size={14} className="shrink-0" aria-hidden /> {p.kicker}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h1 className="font-display text-[2.2rem] font-extrabold uppercase leading-none tracking-tight">{p.titulo}</h1>
          {p.selos}
        </div>

        {p.bloqueio && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-boia bg-sangue px-3 py-2 text-sm font-semibold">
            <ShieldAlert size={18} className="mt-px shrink-0 text-boia-clara" aria-hidden />
            <span>
              Não recomendado – segurança
              <span className="block font-normal text-osso/85">{p.bloqueio}</span>
            </span>
          </p>
        )}

        {nivel && p.nota !== null ? (
          <div className="mt-2 flex items-center gap-4">
            <span className={`font-display text-[6.75rem] font-black leading-[0.86] tracking-tight sm:text-[7.5rem] ${p.bloqueio ? "opacity-45" : ""}`}>
              <Contador valor={p.nota} />
            </span>
            <span className="grid min-w-0 justify-items-start gap-1.5">
              <span className="pulo rounded-lg px-2.5 py-1 text-base font-bold leading-tight text-breu" key={nivel.nome} style={{ backgroundColor: COR_NOTA[nivel.nome] }}>
                {nivel.nome}
              </span>
              {p.min != null && p.max != null && (
                <span className="text-xs text-pedra">
                  Pode variar de <strong className="font-semibold text-osso">{p.min}</strong> a <strong className="font-semibold text-osso">{p.max}</strong>
                </span>
              )}
            </span>
          </div>
        ) : (
          <p className="mt-3 font-display text-6xl font-black uppercase leading-none text-osso/80">Tendência</p>
        )}

        <p className="mt-3 text-base leading-snug">{p.motivo}</p>
        {p.confianca && (
          <div className="mt-2.5">
            <Confianca nivel={p.confianca} />
          </div>
        )}
        {p.rodape}
      </div>

      <CenarioRio nota={p.nota} cenario={p.cenario} />
    </section>
  );
}
