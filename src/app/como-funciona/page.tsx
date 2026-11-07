import type { Metadata } from "next";
import Image from "next/image";
import { Peixe } from "@/components/CenaBoia";
import { TituloPagina } from "@/components/TituloPagina";
import { ESCALA, ESPECIES, ESPECIE_IDS, LEGENDA_PERIODO, PESOS, type FatorId } from "@/config/indice";
import { SITE } from "@/config/site";
import { COR_NOTA } from "@/lib/formato";

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

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-3xl font-extrabold uppercase tracking-tight">{titulo}</h2>
      <div className="mt-2 space-y-3 leading-relaxed text-osso/85">{children}</div>
    </section>
  );
}

export default function Pagina() {
  return (
    <>
      <Image src="/logo-completo.png" alt={SITE.nome} width={555} height={494} unoptimized className="mx-auto mb-6 h-auto w-56 sm:w-64" />
      <TituloPagina titulo="A lua não pesca por você" sub={`${SITE.nome} vem de ${SITE.significado}. A nota sai de estudos com pescadores de verdade, não de tabela solunar.`} />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-10">
        <Bloco titulo="A conta">
          <p>Cada fator vira uma nota de 0 a 1 e entra com o seu peso. A soma, vezes 100, é a nota do dia.</p>
          <ul className="painel divide-y divide-osso/8">
            {FATORES.map((f) => {
              const peso = PESOS[f.id] * 100;
              return (
                <li key={f.id} className="p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <strong className="font-semibold">{f.nome}</strong>
                    <span className="font-mono text-sm">{peso.toFixed(0)} pts</span>
                  </div>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-terra">
                    <span className={`block h-full rounded-full ${f.id === "lua" ? "bg-barro" : "bg-broto"}`} style={{ width: `${(peso / 35) * 100}%` }} />
                  </span>
                  <p className="mt-1.5 text-sm text-pedra">{f.texto}</p>
                </li>
              );
            })}
          </ul>
        </Bloco>

        <div className="grid content-start gap-8">
          <Bloco titulo="Por hora">
            <p>
              A nota de cada hora é a do dia ajustada pela janela: o melhor momento vale a nota cheia, o pior perde 21%. A janela depende do peixe.
              A traíra e o black bass rendem no amanhecer e no entardecer; jundiá e catfish, à noite.
            </p>
          </Bloco>

          <Bloco titulo="Água sem termômetro">
            <p>Ninguém publica a temperatura da água do Canoas. A água acompanha o ar com atraso, então a estimativa usa a média do ar:</p>
            <ul className="painel divide-y divide-osso/8 font-mono text-sm">
              <li className="p-3">Rio: média de 3 dias</li>
              <li className="p-3">Açude ou represa: média de 7 dias + 1 °C</li>
              <li className="p-3">Rio de truta: 0,7 × média de 3 dias + 3 °C</li>
            </ul>
            <p>A partir de 10 medições de termômetro num ponto, o site troca a estimativa por uma regressão daquele ponto. É o jeito mais rápido de deixar o índice certeiro.</p>
          </Bloco>

          <Bloco titulo="A escala">
            <ul className="painel divide-y divide-osso/8">
              {ESCALA.map((n, i) => (
                <li key={n.nome} className="flex items-center gap-3 p-3">
                  <span className="size-3 rounded-sm" style={{ backgroundColor: COR_NOTA[n.nome] }} aria-hidden />
                  <span className="flex-1 font-semibold">{n.nome}</span>
                  <span className="font-mono text-xs text-pedra">
                    {i === 0 ? 0 : ESCALA[i - 1].ate + 1}–{n.ate}
                  </span>
                  <span className="flex gap-0.5" role="img" aria-label={`${n.peixes} de 5 peixes`}>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <Peixe key={p} cheio={p <= n.peixes} tam={15} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Bloco>
        </div>

        <Bloco titulo="As oito espécies">
          <div className="painel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-pedra">
                  <th className="p-3 font-normal">Peixe</th>
                  <th className="p-3 font-normal">Água boa</th>
                  <th className="p-3 font-normal">Melhor período</th>
                </tr>
              </thead>
              <tbody>
                {ESPECIE_IDS.map((id) => (
                  <tr key={id} className="border-t border-osso/8">
                    <td className="p-3 font-semibold">{ESPECIES[id].nome}</td>
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

        <div className="grid content-start gap-8">
          <Bloco titulo="Até onde confiar">
            <p>
              O tempo erra mais quanto mais longe. Nos 3 primeiros dias há nota e hora a hora; do 4º ao 7º, nota em faixa; depois disso, só tendência, com lua e média da água.
              A confiança vem de 31 cenários de previsão: quando concordam, ela é alta. Mesmo com o clima certo, ninguém garante peixe.
            </p>
          </Bloco>

          <Bloco titulo="Fontes">
            <ul className="list-inside list-disc space-y-1 text-sm text-pedra">
              {FONTES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="text-sm text-pedra">Clima: Open-Meteo. Sol e lua: SunCalc.</p>
          </Bloco>
        </div>
      </div>
    </>
  );
}
