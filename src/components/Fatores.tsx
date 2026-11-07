import { ChevronDown, Clock, Satellite, Sprout } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ESPECIES, PESOS_POR_TIPO, type CondicaoId, type EspecieId } from "@/config/indice";
import { diaMes, horaTexto } from "@/lib/formato";
import { apetite, condicoes, fmt } from "@/lib/indice/calculo";
import type { DiaPrevisao, InfoFontes, Local, NotaEspecie, Origem } from "@/lib/indice/tipos";
import { COR_FATOR, ICONE_FATOR, corDoFator } from "@/lib/visual";
import { IconeLua } from "./IconeLua";
import { TituloSecao } from "./TituloSecao";

/** A curva de apetite da espécie, com a água de hoje marcada nela. */
function CurvaAgua({ especie, temp }: { especie: EspecieId; temp: number }) {
  const e = ESPECIES[especie];
  const de = Math.min(e.min - 3, temp - 2);
  const ate = Math.max(e.max + 3, temp + 2);
  const x = (t: number) => ((t - de) / (ate - de)) * 300;
  const y = (v: number) => 54 - v * 46;
  const pontos = Array.from({ length: 41 }, (_, i) => e.min + ((e.max - e.min) * i) / 40);
  const curva = pontos.map((t) => `${x(t).toFixed(1)} ${y(apetite(t, e)).toFixed(1)}`).join("L");
  return (
    <figure className="mt-3">
      <svg viewBox="0 0 300 62" className="w-full" role="img" aria-label={`Curva de apetite: melhor de ${e.otMin} a ${e.otMax} graus, quase nada abaixo de ${e.min}. Água estimada em ${fmt(temp)} graus`}>
        <path d={`M${curva}Z`} fill="#1e7a80" fillOpacity=".6" stroke="#62d6d3" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={`M0 ${y(0)}H300`} stroke="#6b4a2c" strokeWidth="2" />
        <circle cx={x(temp)} cy={y(apetite(temp, e))} r="5" fill="#de4331" stroke="#f3f0e4" strokeWidth="1.5" />
      </svg>
      <figcaption className="mt-1 flex justify-between gap-2 font-mono text-xs text-pedra">
        <span>{e.min} °C quase não come</span>
        <span className="text-rio-claro">melhor {e.otMin}–{e.otMax} °C</span>
        <span>{e.max} °C</span>
      </figcaption>
    </figure>
  );
}

function Barra({ valor, largura = 100, i }: { valor: number; largura?: number; i: number }) {
  return (
    <span className="h-2 flex-1 overflow-hidden rounded-full bg-breu/70">
      <span className="block h-full overflow-hidden rounded-full bg-terra" style={{ width: `${largura}%` }}>
        <span className="barra block h-full rounded-full" style={{ width: `${valor * 100}%`, backgroundColor: corDoFator(valor), "--i": i } as CSSProperties} />
      </span>
    </span>
  );
}

/** Um dos três números que se multiplicam na nota. */
function Peca({ nome, valor, cor }: { nome: string; valor: number; cor: string }) {
  return (
    <span className="ficha grid justify-items-center gap-0.5 px-1 py-2 text-center" style={{ "--acento": cor } as CSSProperties}>
      <span className="font-display text-2xl font-extrabold leading-none">{Math.round(valor * 100)}%</span>
      <span className="text-xs text-pedra">{nome}</span>
    </span>
  );
}

const sinal = (n: number) => `${n > 0 ? "+" : ""}${fmt(n)}`;

const ROTULO_ORIGEM: Record<Origem["tipo"], string> = { observado: "Medido", previsto: "Previsto", estimado: "Estimado", misto: "Medido + previsto" };

/** De onde veio o número: medido numa estação, previsto pelos modelos ou estimado. */
function LinhaOrigem({ origem, ehHoje }: { origem?: Origem; ehHoje: boolean }) {
  if (!origem) return null;
  const tipo = ehHoje ? origem.tipo : origem.tipo === "observado" ? "observado" : "previsto";
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-pedra">
      <Satellite size={13} className="mt-px shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold text-osso/80">{ROTULO_ORIGEM[tipo]}.</strong> {ehHoje ? origem.hoje : origem.depois}
      </span>
    </p>
  );
}

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function Fatores({ dia, especie, nota, local, fontes, ehHoje }: { dia: DiaPrevisao; especie: EspecieId; nota: NotaEspecie; local: Local; fontes: InfoFontes; ehHoje: boolean }) {
  const b = nota.base;
  const f = nota.fatores;
  const a = dia.astro;
  const e = ESPECIES[especie];
  const calibrado = local.calibA != null;
  const hora = `${String(b.hora).padStart(2, "0")}h`;
  const PESOS = PESOS_POR_TIPO[local.tipo] ?? PESOS_POR_TIPO.acude;
  const o = fontes.origens;
  const rio = fontes.rio;
  const represa = fontes.represa;

  const linhas: { id: CondicaoId; nome: string; valor: string; icone?: ReactNode; explicacao: ReactNode; origem?: Origem }[] = [
    {
      id: "tendencia",
      nome: "Tendência da água",
      valor: `${sinal(b.deltaAgua48h)} °C em 48 h`,
      explicacao: "O que mais pesa depois da própria temperatura. Quando a água esfria de repente, como numa frente fria, o peixe para de comer por um tempo.",
      origem: o.temp,
    },
    {
      id: "vento",
      nome: "Vento",
      valor: `${fmt(b.vento)} m/s`,
      explicacao: "De 1 a 5 m/s é o melhor: mexe a água, oxigena e reduz a luz. Vento forte atrapalha e, acima de 12 m/s, é perigoso.",
      origem: o.vento,
    },
    {
      id: "chuva",
      nome: "Chuva em 48 h",
      valor: `${fmt(b.chuva48h)} mm`,
      explicacao: `Chuva forte embarra a água e atrapalha quem caça com a visão. Quanto pesa depende do peixe: ${e.artigo} ${e.nome.toLowerCase()} fica com ${Math.round(e.chuvaForte * 100)}% depois de muita chuva.`,
      origem: o.chuva,
    },
    {
      id: "nuvens",
      nome: "Nuvens",
      valor: `${fmt(b.nuvens, 0)}%`,
      explicacao: "Só conta de dia. De 40 a 80% tira a luz forte da água sem fechar o tempo, e cada espécie reage de um jeito ao céu limpo.",
      origem: o.nuvens,
    },
    {
      id: "pressao",
      nome: "Pressão",
      valor: `${sinal(b.deltaPressao24h)} hPa em 24 h`,
      explicacao: "Não há prova de que o peixe sinta o barômetro. A pressão entra porque, subindo rápido, ela denuncia a frente fria.",
      origem: o.pressao,
    },
    {
      id: "lua",
      nome: "Lua",
      icone: <IconeLua astro={a} />,
      valor: `${Math.round(a.iluminacao * 100)}% iluminada`,
      explicacao: (
        <>
          Sem exagero: os estudos mostram efeito pequeno, por isso a lua vale só {Math.round(PESOS.lua * 100)}% das condições aqui, e a tabela solunar ficou de fora.
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
      id: "rio",
      nome: "Nível do rio",
      valor: rio ? `${sinal(rio.variacao)} cm em 24 h` : "sem medida",
      explicacao: rio
        ? "Rio subindo traz água barrenta e correnteza; mais de 1 m em 24 h é cheia e perigo. Estável é o melhor. O nível só vale para hoje e amanhã."
        : "Nenhuma estação da ANA respondeu para este rio, então o nível não tirou nada da nota. Em Locais dá para escolher a estação certa.",
      origem: o.rio,
    },
    {
      id: "represa",
      nome: "Nível da represa",
      valor: represa ? `${represa.variacao > 0 ? "+" : ""}${fmt(represa.variacao, 2)} m em 7 dias` : "sem medida",
      explicacao: represa ? (
        <>
          Represa esvaziando expõe a margem e espalha o peixe: queda de 1 a 3 m em 7 dias tira bastante, e acima de 3 m tira mais. Subir ou ficar parada não tira nada.
          <span className="mt-1 block font-mono text-xs text-pedra">
            Nível {fmt(represa.atual, 2)} m{represa.volume != null && represa.volume <= 100 ? ` · ${fmt(represa.volume, 0)}% do volume útil` : ""}
          </span>
        </>
      ) : (
        "Nem o ONS nem a ANA deram o nível desta represa agora, então ele não tirou nada da nota."
      ),
      origem: o.represa,
    },
  ];

  const IconeAgua = ICONE_FATOR.agua;
  const maiorPeso = Math.max(...Object.values(PESOS));
  const visiveis = linhas.filter((l) => PESOS[l.id] > 0);

  return (
    <section className="revelar" aria-labelledby="titulo-fatores">
      <TituloSecao id="titulo-fatores" titulo="Por que essa nota" Icone={Sprout} cor="#a9cb54" lado={<span className="font-mono text-xs text-pedra">{diaMes(dia.data)}</span>} />

      <p className="mt-2 text-sm text-osso/90">
        A nota multiplica três coisas, na melhor hora do dia ({hora}). Como é multiplicação, se uma delas estiver ruim, as outras não salvam.
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Peca nome="Água" valor={f.agua} cor={COR_FATOR.agua} />
        <Peca nome="Horário" valor={nota.horario} cor="#f2a93b" />
        <Peca nome="Condições" valor={condicoes(f, PESOS) ** 2} cor="#a9cb54" />
      </div>

      <div className="painel mt-2.5 divide-y divide-osso/10 overflow-hidden">
        <details className="group" style={{ "--acento": COR_FATOR.agua } as CSSProperties}>
          <summary className="flex min-h-[66px] items-center gap-3 px-3.5 py-2.5 hover:bg-osso/[0.04]">
            <span className="icone-chip size-10">
              <IconeAgua size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-semibold">Água estimada</span>
                <span className="font-mono text-xs text-pedra">{fmt(b.tempAgua)} °C</span>
              </span>
              <span className="mt-1.5 flex items-center gap-2">
                <Barra valor={f.agua} i={0} />
                <span className="w-12 shrink-0 text-right font-mono text-xs text-osso">{Math.round(f.agua * 100)}%</span>
              </span>
            </span>
            <ChevronDown size={18} className="seta shrink-0 text-pedra transition-transform" aria-hidden />
          </summary>
          <div className="px-3.5 pb-3.5 pl-[4.1rem] text-sm leading-relaxed text-osso/90">
            <p>
              É o apetite do peixe nessa temperatura.{" "}
              {calibrado
                ? `Esta água foi corrigida com ${local.calibN} medições de termômetro feitas neste local.`
                : "Sem termômetro, a água é estimada pelo ar, pelo sol e pela profundidade. Registre medições de termômetro para corrigir este ponto."}
            </p>
            <CurvaAgua especie={especie} temp={b.tempAgua} />
            {o.temp && (
              <LinhaOrigem
                origem={{ ...o.temp, hoje: `O ar que esquenta a água: ${minuscula(o.temp.hoje)}`, depois: `O ar que esquenta a água: ${minuscula(o.temp.depois)}` }}
                ehHoje={ehHoje}
              />
            )}
          </div>
        </details>

        <details className="group" style={{ "--acento": "#f2a93b" } as CSSProperties}>
          <summary className="flex min-h-[66px] items-center gap-3 px-3.5 py-2.5 hover:bg-osso/[0.04]">
            <span className="icone-chip size-10">
              <Clock size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-semibold">Horário</span>
                <span className="font-mono text-xs text-pedra">melhor às {hora}</span>
              </span>
              <span className="mt-1.5 flex items-center gap-2">
                <Barra valor={nota.horario} i={1} />
                <span className="w-12 shrink-0 text-right font-mono text-xs text-osso">{Math.round(nota.horario * 100)}%</span>
              </span>
            </span>
            <ChevronDown size={18} className="seta shrink-0 text-pedra transition-transform" aria-hidden />
          </summary>
          <div className="px-3.5 pb-3.5 pl-[4.1rem] text-sm leading-relaxed text-osso/90">
            De dia {e.artigo} {e.nome.toLowerCase()} rende {Math.round(e.luz.dia * 100)}%, no amanhecer e no entardecer {Math.round(e.luz.crepusculo * 100)}%, e à noite {Math.round(e.luz.noite * 100)}%. São estimativas pelo hábito do peixe, e os primeiros números a ajustar com as pescarias registradas.
          </div>
        </details>

        {visiveis.map(({ id, nome, icone, valor, explicacao, origem }, i) => {
          const Icone = ICONE_FATOR[id];
          const peso = PESOS[id];
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
                    {/* A largura da trilha é o peso da condição: a lua fica visivelmente menor que a tendência. */}
                    <Barra valor={f[id]} largura={(peso / maiorPeso) * 100} i={i + 2} />
                    <span className="w-12 shrink-0 text-right font-mono text-xs text-osso">{Math.round(f[id] * 100)}%</span>
                  </span>
                </span>
                <ChevronDown size={18} className="seta shrink-0 text-pedra transition-transform" aria-hidden />
              </summary>
              <div className="px-3.5 pb-3.5 pl-[4.1rem] text-sm leading-relaxed text-osso/90">
                {explicacao}
                <LinhaOrigem origem={origem} ehHoje={ehHoje} />
              </div>
            </details>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-pedra">Valores da melhor hora do dia. Toque em cada linha para entender. A barra menor pesa menos nas condições.</p>
    </section>
  );
}
