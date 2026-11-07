"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { CircleCheck, CircleSlash, Clock3, FileText, Layers, RadioTower, Target, TriangleAlert } from "lucide-react";
import { LOCAIS_PADRAO } from "@/config/indice";
import { lerPrevisao, prefs } from "@/lib/armazem";
import { fmt } from "@/lib/indice/calculo";
import type { Previsao } from "@/lib/indice/tipos";
import { TituloSecao } from "./TituloSecao";

type Estado = "ok" | "atrasada" | "falhou" | "desligada";

interface LinhaFonte {
  fonte: string;
  nome: string;
  grupo: string;
  ultimaTentativa: string;
  ultimoSucesso: string | null;
  dadoDe: string | null;
  erro: string | null;
  estado: Estado;
}

interface RespostaFontes {
  banco: boolean;
  fontes: LinhaFonte[];
  desligadas: { grupo: string; nome: string; motivo: string }[];
  ultimaRotina: string | null;
}

/** Cor e ícone andam juntos com o nome: o estado nunca depende só da cor. */
const ESTADO: Record<Estado, { nome: string; cor: string; Icone: typeof CircleCheck }> = {
  ok: { nome: "OK", cor: "#a9dc4f", Icone: CircleCheck },
  atrasada: { nome: "Atrasada", cor: "#f2a93b", Icone: Clock3 },
  falhou: { nome: "Falhou", cor: "#ec7a5c", Icone: TriangleAlert },
  desligada: { nome: "Desligada", cor: "#c2c6b6", Icone: CircleSlash },
};

const quando = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
    : "nunca";

/** Só as fontes de observação guardam a resposta bruta a cada busca. */
const temBruto = (fonte: string) => /^(ana|inmet|epagri):/.test(fonte) || fonte === "ons";

function Chip({ estado }: { estado: Estado }) {
  const e = ESTADO[estado];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: e.cor, backgroundColor: `color-mix(in srgb, ${e.cor} 16%, transparent)` }}>
      <e.Icone size={13} aria-hidden /> {e.nome}
    </span>
  );
}

/** Quanto os modelos concordam hoje, em palavras: diferença entre o que prevê mais e o que prevê menos. */
function concordancia(temp: number, chuva: number) {
  if (temp <= 2 && chuva <= 5) return { texto: "Concordam bem", cor: "#a9dc4f" };
  if (temp <= 4 && chuva <= 15) return { texto: "Concordam em parte", cor: "#f2a93b" };
  return { texto: "Discordam bastante", cor: "#ec7a5c" };
}

export function PainelFontes() {
  const [dados, setDados] = useState<RespostaFontes | null>(null);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const local = prefs.local() ?? LOCAIS_PADRAO[0].id;
    setPrevisao(lerPrevisao(local));
    fetch("/api/fontes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDados)
      .catch(() => setErro(true));
    fetch(`/api/indice?local=${encodeURIComponent(local)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPrevisao)
      .catch(() => {});
  }, []);

  const hoje = previsao?.dias[0];
  const modelos = previsao?.fontes?.hoje ?? [];
  const disc = hoje?.discordancia;
  const grupos = dados ? [...new Set([...dados.fontes.map((f) => f.grupo), ...dados.desligadas.map((d) => d.grupo)])] : [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-2 lg:gap-8">
      <section aria-labelledby="titulo-hoje" className="min-w-0">
        <TituloSecao id="titulo-hoje" titulo="Modelos hoje" Icone={Layers} cor="#62d6d3" />
        {!previsao ? (
          <p className="painel mt-2.5 p-4 text-sm text-pedra">Carregando a previsão…</p>
        ) : !modelos.length ? (
          <p className="painel mt-2.5 p-4 text-sm text-pedra">Os modelos extras não responderam nesta previsão: o índice está usando só o clima principal.</p>
        ) : (
          <div className="painel mt-2.5 overflow-hidden">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-osso/10 px-3.5 py-3 text-sm">
              <span className="font-semibold">{previsao.local.nome}</span>
              {disc && (
                <span className="font-semibold" style={{ color: concordancia(disc.temp, disc.chuva).cor }}>
                  · {concordancia(disc.temp, disc.chuva).texto}
                </span>
              )}
            </p>
            {disc && (
              <p className="px-3.5 pt-3 text-sm text-osso/90">
                Entre o modelo que mais prevê e o que menos prevê: {fmt(disc.temp)} °C na temperatura média, {fmt(disc.chuva)} mm na chuva do dia e {fmt(disc.vento)} m/s no vento. Quanto maior a diferença, menor a confiança do dia.
              </p>
            )}
            <div className="overflow-x-auto px-1.5 pb-2 pt-1">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="sr-only">Previsão de cada modelo para hoje</caption>
                <thead className="text-xs text-pedra">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Modelo</th>
                    <th className="px-2 py-2 text-right font-semibold">Ar</th>
                    <th className="px-2 py-2 text-right font-semibold">Chuva</th>
                    <th className="px-2 py-2 text-right font-semibold">Vento</th>
                    <th className="px-2 py-2 text-right font-semibold">Nuvens</th>
                    <th className="px-2 py-2 text-right font-semibold">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-osso/10 font-mono text-xs">
                  {modelos.map((m) => (
                    <tr key={m.id}>
                      <td className="px-2 py-2 font-sans text-sm font-semibold">{m.nome}</td>
                      <td className="px-2 py-2 text-right">{m.temp != null ? `${fmt(m.temp)} °C` : "–"}</td>
                      <td className="px-2 py-2 text-right">{m.chuva != null ? `${fmt(m.chuva)} mm` : "–"}</td>
                      <td className="px-2 py-2 text-right">{m.vento != null ? `${fmt(m.vento)} m/s` : "–"}</td>
                      <td className="px-2 py-2 text-right">{m.nuvens != null ? `${fmt(m.nuvens, 0)}%` : "–"}</td>
                      <td className="px-2 py-2 text-right">{m.peso === 0 && m.nome.includes("(=") ? "fora" : m.peso != null ? `${Math.round(m.peso * 100)}%` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-osso/10 px-3.5 py-2.5 text-xs text-pedra">
              {previsao.fontes.pesos === "precisao" ? "Peso pela precisão de cada modelo na temperatura de 1 dia, medida contra a estação." : "Pesos iguais: ainda não há conferência contra estação suficiente para dar peso pela precisão."}{" "}
              <Link href="/precisao" className="font-semibold text-osso/85 underline underline-offset-2">
                Ver a precisão
              </Link>
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-fontes" className="min-w-0">
        <TituloSecao id="titulo-fontes" titulo="Situação" Icone={RadioTower} cor="#a9cb54" />
        {erro && <p className="painel mt-2.5 p-4 text-sm text-pedra">Não deu para ler a situação das fontes agora.</p>}
        {dados && !dados.banco && <p className="painel mt-2.5 p-4 text-sm text-pedra">Sem banco ligado, a situação das fontes não fica guardada.</p>}
        {dados && dados.banco && !dados.fontes.length && <p className="painel mt-2.5 p-4 text-sm text-pedra">Nenhuma busca registrada ainda. Abra o Índice uma vez e volte aqui.</p>}
        <div className="mt-2.5 grid gap-3">
          {grupos.map((g) => (
            <div key={g} className="painel overflow-hidden">
              <h3 className="border-b border-osso/10 px-3.5 py-2.5 text-sm font-bold">{g}</h3>
              <ul className="divide-y divide-osso/10">
                {dados!.fontes
                  .filter((f) => f.grupo === g)
                  .map((f) => (
                    <li key={f.fonte} className="grid gap-1 px-3.5 py-2.5" style={{ "--acento": ESTADO[f.estado].cor } as CSSProperties}>
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 text-sm font-semibold">{f.nome.replace(`${g} · `, "")}</span>
                        <Chip estado={f.estado} />
                      </span>
                      <span className="text-xs text-pedra">
                        Dado de {quando(f.dadoDe ?? f.ultimoSucesso)} · tentou às {quando(f.ultimaTentativa)}
                        {f.erro && f.estado !== "ok" ? ` · ${f.erro}` : ""}
                      </span>
                      {temBruto(f.fonte) && f.ultimoSucesso && (
                        <a href={`/api/fontes?bruto=${encodeURIComponent(f.fonte)}`} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1 text-xs font-semibold text-osso/85 underline underline-offset-2">
                          <FileText size={13} aria-hidden /> Ver a resposta guardada
                        </a>
                      )}
                    </li>
                  ))}
                {dados!.desligadas
                  .filter((d) => d.grupo === g)
                  .map((d) => (
                    <li key={d.nome} className="grid gap-1 px-3.5 py-2.5">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 text-sm font-semibold">{d.nome.replace(`${g} · `, "")}</span>
                        <Chip estado="desligada" />
                      </span>
                      <span className="text-xs text-pedra">{d.motivo}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        {dados && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-pedra">
            <Target size={13} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Última conferência diária dos modelos: {quando(dados.ultimaRotina)}. Respostas brutas ficam guardadas por 30 dias.
            </span>
          </p>
        )}
      </section>
    </div>
  );
}
