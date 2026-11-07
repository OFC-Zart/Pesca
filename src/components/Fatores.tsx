import { ChevronDown, Sprout } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ESPECIES, PESOS, type EspecieId, type FatorId } from "@/config/indice";
import { diaMes, horaTexto } from "@/lib/formato";
import { fmt } from "@/lib/indice/calculo";
import type { DiaPrevisao, Fatores as NotasFatores, Local } from "@/lib/indice/tipos";
import { COR_FATOR, ICONE_FATOR, corDoFator } from "@/lib/visual";
import { IconeLua } from "./IconeLua";
import { TituloSecao } from "./TituloSecao";

function CurvaAgua({ especie, temp }: { especie: EspecieId; temp: number }) {
  const e = ESPECIES[especie];
  const de = Math.min(e.min - 3, temp - 2);
  const ate = Math.max(e.max + 3, temp + 2);
  const x = (t: number) => ((t - de) / (ate - de)) * 300;
  const y = (v: number) => 54 - v * 46;
  const nota = temp <= e.min || temp >= e.max ? 0 : temp < e.otMin ? (temp - e.min) / (e.otMin - e.min) : temp > e.otMax ? (e.max - temp) / (e.max - e.otMax) : 1;
  return (
    <figure className="mt-3">
      <svg viewBox="0 0 300 62" className="w-full" role="img" aria-label={`Curva de temperatura: faixa ótima de ${e.otMin} a ${e.otMax} graus, água estimada em ${fmt(temp)} graus`}>
        <path d={`M${x(e.min)} ${y(0)}L${x(e.otMin)} ${y(1)}L${x(e.otMax)} ${y(1)}L${x(e.max)} ${y(0)}Z`} fill="#1e7a80" fillOpacity=".6" stroke="#62d6d3" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={`M0 ${y(0)}H300`} stroke="#6b4a2c" strokeWidth="2" />
        <circle cx={x(temp)} cy={y(nota)} r="5" fill="#de4331" stroke="#f3f0e4" strokeWidth="1.5" />
      </svg>
      <figcaption className="mt-1 flex justify-between gap-2 font-mono text-xs text-pedra">
        <span>{e.min} °C parado</span>
        <span className="text-rio-claro">ótimo {e.otMin}–{e.otMax} °C</span>
        <span>{e.max} °C</span>
      </figcaption>
    </figure>
  );
}

interface LinhaFator {
  id: FatorId;
  nome: string;
  icone?: ReactNode;
  valor: string;
  explicacao: ReactNode;
}

const sinal = (n: number) => `${n > 0 ? "+" : ""}${fmt(n)}`;

export function Fatores({ dia, especie, fatores, local }: { dia: DiaPrevisao; especie: EspecieId; fatores: NotasFatores; local: Local }) {
  const b = dia.brutos;
  const a = dia.astro;
  const calibrado = local.calibA != null;
  const linhas: LinhaFator[] = [
    {
      id: "agua",
      nome: "Água estimada",
      valor: `${fmt(b.tempAgua)} °C`,
      explicacao: (
        <>
          <p>
            {calibrado
              ? `Calculada com ${local.calibN} medições de termômetro feitas neste local.`
              : "Ninguém mede a água do Canoas em público: ela é estimada pela média do ar dos últimos dias. Registre medições de termômetro para calibrar este local."}
          </p>
          <CurvaAgua especie={especie} temp={b.tempAgua} />
        </>
      ),
    },
    {
      id: "tendencia",
      nome: "Tendência da água",
      valor: `${sinal(b.deltaAgua48h)} °C em 48 h`,
      explicacao: "Vale mais quando a água vem esquentando rumo ao ótimo e perde força se esfriou mais de 3 °C em 48 h.",
    },
    {
      id: "pressao",
      nome: "Pressão",
      valor: `${sinal(b.deltaPressao24h)} hPa em 24 h`,
      explicacao: "O peixe não sente o barômetro diretamente. A pressão entra porque, subindo rápido, ela denuncia frente fria: queda de temperatura, céu limpo e vento sul.",
    },
    {
      id: "vento",
      nome: "Vento",
      valor: `${fmt(b.vento)} m/s`,
      explicacao: "De 1 a 5 m/s é o melhor: mexe a água, oxigena e reduz a luz. Vento forte atrapalha e, acima de 12 m/s, é perigoso.",
    },
    {
      id: "chuva",
      nome: "Chuva em 48 h",
      valor: `${fmt(b.chuva48h)} mm`,
      explicacao: "Chuva forte deixa a água barrenta e atrapalha quem caça com a visão. Jundiá e catfish sofrem menos.",
    },
    {
      id: "lua",
      nome: "Lua",
      icone: <IconeLua astro={a} />,
      valor: `${Math.round(a.iluminacao * 100)}% iluminada`,
      explicacao: (
        <>
          Sem exagero: os estudos mostram efeito pequeno, por isso a lua vale só 10 pontos de 100.
          {a.nascerLua !== null || a.porLua !== null ? (
            <span className="mt-1 block font-mono text-xs text-pedra">
              {a.nascerLua !== null && `Nasce ${horaTexto(a.nascerLua)} · `}
              {a.porLua !== null && `Põe ${horaTexto(a.porLua)} · `}
              No alto {horaTexto(a.luaAlta)}
            </span>
          ) : null}
        </>
      ),
    },
    {
      id: "nuvens",
      nome: "Nuvens",
      valor: `${fmt(b.nuvens, 0)}%`,
      explicacao: "De 40 a 80% de nuvens é o ideal: tira a luz forte da água sem fechar o dia. Cada espécie reage diferente ao céu limpo.",
    },
  ];

  return (
    <section className="revelar" aria-labelledby="titulo-fatores">
      <TituloSecao id="titulo-fatores" titulo="Por que essa nota" Icone={Sprout} cor="#a9cb54" lado={<span className="font-mono text-xs text-pedra">{diaMes(dia.data)}</span>} />
      <div className="painel mt-2.5 divide-y divide-osso/10 overflow-hidden">
        {linhas.map(({ id, nome, icone, valor, explicacao }, i) => {
          const peso = PESOS[id] * 100;
          const pontos = PESOS[id] * fatores[id] * 100;
          const Icone = ICONE_FATOR[id];
          return (
            <details key={id} className="group" style={{ "--acento": COR_FATOR[id] } as CSSProperties}>
              <summary className="flex min-h-[66px] items-center gap-3 px-3.5 py-2.5 hover:bg-osso/[0.04]">
                <span className="icone-chip size-10">{icone ?? <Icone size={20} aria-hidden />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-semibold">{nome}</span>
                    <span className="font-mono text-xs text-pedra">{valor}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    {/* A largura da trilha é o peso do fator: a lua fica visivelmente menor que a água. */}
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-breu/70">
                      <span className="block h-full overflow-hidden rounded-full bg-terra" style={{ width: `${(peso / 35) * 100}%` }}>
                        <span className="barra block h-full rounded-full" style={{ width: `${fatores[id] * 100}%`, backgroundColor: corDoFator(fatores[id]), "--i": i } as CSSProperties} />
                      </span>
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-xs text-osso">
                      {fmt(pontos, 0)}/{peso.toFixed(0)}
                    </span>
                  </span>
                </span>
                <ChevronDown size={18} className="seta shrink-0 text-pedra transition-transform" aria-hidden />
              </summary>
              <div className="px-3.5 pb-3.5 pl-[4.1rem] text-sm leading-relaxed text-osso/90">{explicacao}</div>
            </details>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-pedra">Pontos que cada fator somou na nota, de um total de 100. Toque para entender cada um.</p>
    </section>
  );
}
