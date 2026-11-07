import { BookMarked, Calculator, Clock, Fish, Gauge, ShieldCheck, Thermometer, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import { CardumeConfianca, Peixe, PeixeEspecie } from "@/components/Peixes";
import { TituloPagina } from "@/components/TituloPagina";
import { TituloSecao } from "@/components/TituloSecao";
import { ESCALA, ESPECIES, ESPECIE_IDS, LEGENDA_PERIODO, PESOS, type FatorId } from "@/config/indice";
import { SITE } from "@/config/site";
import { COR_NOTA } from "@/lib/formato";
import type { NivelConfianca } from "@/lib/indice/tipos";
import { COR_ESPECIE, COR_FATOR, ICONE_FATOR } from "@/lib/visual";

export const metadata: Metadata = { title: "Como funciona" };

const FATORES: { id: FatorId; nome: string; texto: string }[] = [
  { id: "agua", nome: "Água", texto: "O que mais pesa. A temperatura controla o metabolismo e a fome, e cada espécie tem a sua curva." },
  { id: "pressao", nome: "Pressão", texto: "Não afeta o peixe direto, mas denuncia frente fria quando sobe rápido." },
  { id: "tendencia", nome: "Tendência", texto: "Água esquentando rumo ao ótimo ajuda. Queda de mais de 3 °C em 48 h atrapalha." },
  { id: "vento", nome: "Vento", texto: "Leve a moderado mexe a água, oxigena e reduz a luz." },
  { id: "chuva", nome: "Chuva", texto: "Chuva forte embarra a água e atrapalha quem caça com a visão." },
  { id: "nuvens", nome: "Nuvens", texto: "De 40 a 80% é o ideal para a maioria das espécies." },
  { id: "lua", nome: "Lua", texto: "Está aqui, mas pequena. Os estudos mostram pouco efeito." },
];

const NIVEIS: { nivel: NivelConfianca; nome: string; texto: string }[] = [
  { nivel: "alta", nome: "Alta", texto: "Os cenários do tempo concordam." },
  { nivel: "media", nome: "Média", texto: "Há alguma diferença entre eles." },
  { nivel: "baixa", nome: "Baixa", texto: "Eles discordam bastante." },
];

const FONTES = [
  "Popular solunar tables fail to predict fishing success (SN Applied Sciences, 2023)",
  "Kuparinen et al. 2010: correlatos de captura do lúcio",
  "Shaw et al. 2021: walleye e muskellunge (PLoS ONE)",
  "Traíra e temperatura da água (UFPel)",
  "Jundiá: crescimento × temperatura (Instituto de Pesca)",
  "Ictiofauna do alto Uruguai e Rio Canoas (PUCRS, 1989)",
  "Temperatura de rio a partir do ar (UFPR) e limites do modelo (Arismendi et al. 2014)",
  "Piracema 2026/27 na bacia do Uruguai: regras da Polícia Militar Ambiental",
];

function Bloco({ titulo, Icone, cor, children }: { titulo: string; Icone: LucideIcon; cor: string; children: React.ReactNode }) {
  return (
    <section className="revelar min-w-0">
      <TituloSecao titulo={titulo} Icone={Icone} cor={cor} />
      <div className="mt-2.5 space-y-3 leading-relaxed text-osso/90">{children}</div>
    </section>
  );
}

export default function Pagina() {
  return (
    <>
      <Image src="/logo-completo.png" alt={SITE.nome} width={555} height={494} unoptimized className="mx-auto mb-6 h-auto w-52 sm:w-60" />
      <TituloPagina titulo="A lua não pesca por você" cor="#ffe6a0" sub={`${SITE.nome} vem de ${SITE.significado}. A nota sai de estudos com pescadores de verdade, não de tabela solunar.`} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2 lg:gap-x-10">
        <Bloco titulo="A conta" Icone={Calculator} cor="#a9cb54">
          <p>Cada fator vira uma nota de 0 a 1 e entra com o seu peso. A soma, vezes 100, é a nota do dia.</p>
          <ul className="painel divide-y divide-osso/10">
            {FATORES.map((f, i) => {
              const peso = PESOS[f.id] * 100;
              const Icone = ICONE_FATOR[f.id];
              return (
                <li key={f.id} className="flex gap-3 p-3.5" style={{ "--acento": COR_FATOR[f.id], "--i": i } as CSSProperties}>
                  <span className="icone-chip size-10">
                    <Icone size={20} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <strong className="font-semibold">{f.nome}</strong>
                      <span className="font-mono text-sm">{peso.toFixed(0)} pts</span>
                    </div>
                    <span className="mt-1.5 block h-2 rounded-full bg-terra">
                      <span className="barra block h-full rounded-full" style={{ width: `${(peso / 35) * 100}%`, backgroundColor: COR_FATOR[f.id] }} />
                    </span>
                    <p className="mt-1.5 text-sm text-pedra">{f.texto}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Bloco>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8">
          <Bloco titulo="A escala" Icone={Gauge} cor="#f2a93b">
            <ul className="painel divide-y divide-osso/10">
              {ESCALA.map((n, i) => (
                <li key={n.nome} className="flex items-center gap-3 p-3">
                  <span className="rounded-md px-2 py-0.5 text-sm font-bold text-breu" style={{ backgroundColor: COR_NOTA[n.nome] }}>
                    {n.nome}
                  </span>
                  <span className="flex-1 font-mono text-xs text-pedra">
                    {i === 0 ? 0 : ESCALA[i - 1].ate + 1}–{n.ate}
                  </span>
                  <span className="flex gap-0.5" role="img" aria-label={`${n.peixes} de 5 peixes`}>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <Peixe key={p} cheio={p <= n.peixes} tam={17} atraso={p * 0.3} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Bloco>

          <Bloco titulo="Até onde confiar" Icone={ShieldCheck} cor="#62d6d3">
            <p>
              O tempo erra mais quanto mais longe. Nos 3 primeiros dias há nota e hora a hora; do 4º ao 7º, nota em faixa; depois disso, só tendência, com lua e média da água.
              Mesmo com o clima certo, ninguém garante peixe.
            </p>
            <p>Os peixinhos azuis mostram a confiança da previsão do tempo, calculada com 31 cenários:</p>
            <ul className="painel divide-y divide-osso/10">
              {NIVEIS.map((n) => (
                <li key={n.nivel} className="flex items-center gap-3 p-3">
                  <CardumeConfianca nivel={n.nivel} tam={20} />
                  <span className="text-sm">
                    <strong className="font-semibold">{n.nome}:</strong> <span className="text-pedra">{n.texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Bloco>

          <Bloco titulo="Por hora" Icone={Clock} cor="#ffd166">
            <p>
              A nota de cada hora é a do dia ajustada pela janela: o melhor momento vale a nota cheia, o pior perde 21%. A janela depende do peixe.
              A traíra e o black bass rendem no amanhecer e no entardecer; jundiá e catfish, à noite.
            </p>
          </Bloco>
        </div>

        <Bloco titulo="As oito espécies" Icone={Fish} cor="#7fd67a">
          <div className="painel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-pedra">
                  <th className="p-3 font-medium">Peixe</th>
                  <th className="p-3 font-medium">Água boa</th>
                  <th className="p-3 font-medium">Melhor período</th>
                </tr>
              </thead>
              <tbody>
                {ESPECIE_IDS.map((id) => (
                  <tr key={id} className="border-t border-osso/10">
                    <td className="p-3 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <PeixeEspecie cor={COR_ESPECIE[id]} tam={18} />
                        {ESPECIES[id].nome}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-3 font-mono text-xs">
                      {ESPECIES[id].otMin}–{ESPECIES[id].otMax} °C
                    </td>
                    <td className="p-3 text-xs text-pedra">{LEGENDA_PERIODO[ESPECIES[id].periodo]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-pedra">Os períodos e os efeitos de chuva e céu limpo são estimativas pelo hábito de cada peixe, e serão os primeiros números a ajustar com os registros.</p>
        </Bloco>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8">
          <Bloco titulo="Água sem termômetro" Icone={Thermometer} cor="#62d6d3">
            <p>Ninguém publica a temperatura da água do Canoas. A água acompanha o ar com atraso, então a estimativa usa a média do ar:</p>
            <ul className="painel divide-y divide-osso/10 font-mono text-sm">
              <li className="p-3">Rio: média de 3 dias</li>
              <li className="p-3">Açude ou represa: média de 7 dias + 1 °C</li>
              <li className="p-3">Rio de truta: 0,7 × média de 3 dias + 3 °C</li>
            </ul>
            <p>A partir de 10 medições de termômetro num ponto, o site troca a estimativa por uma regressão daquele ponto. É o jeito mais rápido de deixar o índice certeiro.</p>
          </Bloco>

          <Bloco titulo="Fontes" Icone={BookMarked} cor="#d0a26b">
            <ul className="list-inside list-disc space-y-1 text-sm text-pedra">
              {FONTES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="text-sm text-pedra">Clima: Open-Meteo. Sol e lua: SunCalc. Fotinhas de peixe: ilustrações em domínio público (CC0) do FreeSVG.</p>
          </Bloco>
        </div>
      </div>
    </>
  );
}
