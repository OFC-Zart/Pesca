import { BookMarked, Calculator, Clock, Fish, Gauge, Layers, ShieldCheck, Thermometer, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import { CardumeConfianca, Peixe, PeixeEspecie } from "@/components/Peixes";
import { TituloPagina } from "@/components/TituloPagina";
import { TituloSecao } from "@/components/TituloSecao";
import { ESCALA, ESPECIES, ESPECIE_IDS, LEGENDA_PERIODO, PESOS_POR_TIPO, type CondicaoId } from "@/config/indice";
import { SITE } from "@/config/site";
import { COR_NOTA } from "@/lib/formato";
import type { NivelConfianca } from "@/lib/indice/tipos";
import { COR_ESPECIE, COR_FATOR, ICONE_FATOR } from "@/lib/visual";

export const metadata: Metadata = { title: "Como funciona" };

const CONDICOES: { id: CondicaoId; nome: string; texto: string }[] = [
  { id: "tendencia", nome: "Tendência da água", texto: "Água esfriando de repente, como numa frente fria, faz o peixe parar de comer." },
  { id: "vento", nome: "Vento", texto: "Leve a moderado mexe a água, oxigena e reduz a luz." },
  { id: "chuva", nome: "Chuva", texto: "Chuva forte embarra a água. Pesa mais para quem caça com a visão." },
  { id: "nuvens", nome: "Nuvens", texto: "De dia, de 40 a 80% é o ideal para a maioria das espécies." },
  { id: "pressao", nome: "Pressão", texto: "Sem prova de efeito direto. Entra porque denuncia a frente fria." },
  { id: "lua", nome: "Lua", texto: "Está aqui, mas pequena: os estudos mostram pouco efeito." },
  { id: "rio", nome: "Nível do rio", texto: "Só no rio. Medido pela ANA: subindo mais de 30 cm em 24 h derruba; mais de 1 m é cheia e acende o aviso." },
  { id: "represa", nome: "Nível da represa", texto: "Só na represa. Medido pelo ONS: queda de 1 a 3 m em 7 dias tira bastante; acima de 3 m, mais." },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;

const NIVEIS: { nivel: NivelConfianca; nome: string; texto: string }[] = [
  { nivel: "alta", nome: "Alta", texto: "Os cenários do tempo concordam." },
  { nivel: "media", nome: "Média", texto: "Há alguma diferença entre eles." },
  { nivel: "baixa", nome: "Baixa", texto: "Eles discordam bastante, ou os seis modelos discordam entre si." },
];

const FONTES = [
  "Epagri: Avaliação do potencial para a piscicultura continental em Santa Catarina (faixas de temperatura por espécie)",
  "Epagri: água medida em Caçador, de março a setembro de 2009 (livro do jundiá, cap. II)",
  "Popular solunar tables fail to predict fishing success (SN Applied Sciences, 2023)",
  "Kuparinen et al. 2010: correlatos de captura do lúcio",
  "Shaw et al. 2021: walleye e muskellunge (PLoS ONE)",
  "Manns: captura de bass ao entardecer (In-Fisherman)",
  "Traíra e temperatura da água (UFPel) e consumo de presas em juvenis (Alto Paraná)",
  "Jundiá: crescimento × temperatura (Piedras 2004) e faixas da Epagri",
  "Tilápia: alimentação abaixo de 16 °C (El-Sayed 1996; Abdel-Ghany 2019) e Kubitza",
  "Carpa capim e black bass: USFWS e revisão em Water (2023)",
  "Boyd (Auburn): temperatura da água em viveiros",
  "Piracema 2026/27 na bacia do Uruguai: regras da Polícia Militar Ambiental",
  "Open-Meteo: modelos ECMWF IFS, GFS, ICON, GEM e JMA, Previous Runs API e Historical Forecast API",
  "INMET: estações automáticas de Lages, São Joaquim, Campos Novos, Curitibanos e Vacaria",
  "ANA: Hidro-Telemetria (nível e chuva dos rios Canoas, Caveiras, Pelotas e afluentes)",
  "ONS: dados hidrológicos diários dos reservatórios (Campos Novos, Barra Grande, Garibaldi e São Roque)",
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
      <TituloPagina titulo="A lua não pesca por você" cor="#ffe6a0" sub={`${SITE.nome} vem de ${SITE.significado}. A nota sai de estudos e de medições, não de tabela solunar.`} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2 lg:gap-x-10">
        <Bloco titulo="A conta" Icone={Calculator} cor="#a9cb54">
          <p>
            A nota multiplica três coisas, hora por hora: <strong className="font-semibold text-osso">água × horário × condições</strong>. Como é multiplicação, água fora da faixa derruba a nota sozinha, porque
            peixe sem apetite não morde, por melhor que esteja o vento. A nota do dia é a média das 4 melhores horas.
          </p>
          <ul className="painel divide-y divide-osso/10">
            <li className="flex gap-3 p-3.5" style={{ "--acento": COR_FATOR.agua } as CSSProperties}>
              <span className="icone-chip size-10">
                <Thermometer size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="font-semibold">Água</strong>
                <p className="mt-0.5 text-sm text-pedra">O apetite do peixe naquela temperatura, de 0 a 100%. Cada espécie tem sua curva.</p>
              </div>
            </li>
            <li className="flex gap-3 p-3.5" style={{ "--acento": "#f2a93b" } as CSSProperties}>
              <span className="icone-chip size-10">
                <Clock size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="font-semibold">Horário</strong>
                <p className="mt-0.5 text-sm text-pedra">Quanto o peixe rende naquela luz. O pior horário do black bass vale menos da metade do melhor.</p>
              </div>
            </li>
          </ul>
          <p>As condições são uma média destes pesos, com o clima daquela hora. No açude vale a primeira coluna; rio e represa têm pesos próprios e entram com o nível da água:</p>
          <ul className="painel divide-y divide-osso/10">
            {CONDICOES.map((f) => {
              const peso = Math.max(PESOS_POR_TIPO.acude[f.id], PESOS_POR_TIPO.rio[f.id], PESOS_POR_TIPO.represa[f.id]) * 100;
              const Icone = ICONE_FATOR[f.id];
              return (
                <li key={f.id} className="flex gap-3 p-3.5" style={{ "--acento": COR_FATOR[f.id] } as CSSProperties}>
                  <span className="icone-chip size-10">
                    <Icone size={20} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <strong className="font-semibold">{f.nome}</strong>
                      <span className="font-mono text-xs text-pedra">
                        açude {pct(PESOS_POR_TIPO.acude[f.id])} · rio {pct(PESOS_POR_TIPO.rio[f.id])} · represa {pct(PESOS_POR_TIPO.represa[f.id])}
                      </span>
                    </div>
                    <span className="mt-1.5 block h-2 rounded-full bg-terra">
                      <span className="barra block h-full rounded-full" style={{ width: `${(peso / 30) * 100}%`, backgroundColor: COR_FATOR[f.id] }} />
                    </span>
                    <p className="mt-1.5 text-sm text-pedra">{f.texto}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-pedra">A tabela solunar ficou de fora: um estudo de mais de 5 anos não achou relação com a captura.</p>
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

          <Bloco titulo="De onde vem o clima" Icone={Layers} cor="#62d6d3">
            <p>
              O futuro é a média de seis modelos de previsão (ECMWF, GFS, ICON, GEM, JMA e a combinação do Open-Meteo). Todo dia o site confere o que cada um previu, de 1 a 7 dias antes, com o que
              aconteceu em Lages, São Joaquim e Campos Novos. Quem erra menos ganha mais peso (1 ÷ erro²), e o erro que se repete em cada faixa do dia é descontado.
            </p>
            <p>
              O passado vem do que foi medido: chuva das estações da ANA perto do ponto e, com o token do INMET, ar, pressão e vento da estação mais próxima. Sem medição, fica a estimativa do Open-Meteo, e
              a tela diz isso em cada fator.
            </p>
            <p>
              <Link href="/fontes" className="font-semibold underline underline-offset-2">
                Ver as fontes agora
              </Link>{" "}
              ·{" "}
              <Link href="/precisao" className="font-semibold underline underline-offset-2">
                Ver a precisão de cada modelo
              </Link>
            </p>
          </Bloco>

          <Bloco titulo="Por hora" Icone={Clock} cor="#ffd166">
            <p>
              Cada hora usa o clima daquela hora. A traíra e o black bass rendem no amanhecer e no entardecer; jundiá e catfish, à noite; tilápia e carpa capim, de dia. Num estudo com bass,
              a captura ao entardecer foi quase o dobro da média, e a nota respeita essa diferença.
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
        </Bloco>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8">
          <Bloco titulo="Água sem termômetro" Icone={Thermometer} cor="#62d6d3">
            <p>
              Ninguém publica a temperatura dos açudes daqui. O site estima hora a hora: a água corre atrás do ar mais o calor do sol, e demora mais quanto mais fundo for o açude.
            </p>
            <p>
              O modelo foi ajustado com a água medida pela Epagri em Caçador, de março a setembro de 2009: 15,9 °C às 9 h e 16,9 °C às 15 h, e o modelo dá 15,8 e 16,5. Nas madrugadas mais frias ele ainda erra para baixo.
            </p>
            <ul className="painel divide-y divide-osso/10 font-mono text-sm">
              <li className="p-3">Açude: 2,5 m, a não ser que você informe outra</li>
              <li className="p-3">Represa: 8 m de camada que se mistura</li>
              <li className="p-3">Rio: acompanha o ar de perto e pega pouco sol</li>
            </ul>
            <p>
              A partir de 3 medições de termômetro num ponto, o site corrige o desvio daquele ponto. Com 10 medições em épocas diferentes, ajusta a reta inteira. É o jeito mais rápido de deixar o índice certeiro.
            </p>
          </Bloco>

          <Bloco titulo="O que ainda é estimativa" Icone={ShieldCheck} cor="#ff9d62">
            <p>
              As faixas de temperatura vêm de estudos e da Epagri, mas sobre crescimento e alimentação, não sobre mordida no anzol. Os horários e o efeito da chuva por espécie são estimativas pelo hábito do peixe.
              Nenhum app grátis ou pago publica teste independente de acerto. A nota só fica provada com as pescarias de vocês, incluindo os dias zerados.
            </p>
          </Bloco>

          <Bloco titulo="Fontes" Icone={BookMarked} cor="#d0a26b">
            <ul className="list-inside list-disc space-y-1 text-sm text-pedra">
              {FONTES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="text-sm text-pedra">Clima: Open-Meteo, INMET, ANA e ONS. Sol e lua: SunCalc. Fotinhas de peixe: ilustrações em domínio público (CC0) do FreeSVG.</p>
          </Bloco>
        </div>
      </div>
    </>
  );
}
