"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { BarChart3, CloudUpload, Fish, Hourglass, ListChecks, Tally5, Waves } from "lucide-react";
import { ESPECIES, LOCAIS_PADRAO, type EspecieId } from "@/config/indice";
import { enviarPendentes, lerDiario, lerPerfil } from "@/lib/armazem";
import { resumirCpue, horasDaSaida, type SaidaResumo } from "@/lib/cpue";
import { diaMes } from "@/lib/formato";
import { fmt } from "@/lib/indice/calculo";
import { corDaEspecie } from "@/lib/visual";
import { Avatar } from "./Avatar";
import { PeixeEspecie } from "./Peixes";
import { TituloSecao } from "./TituloSecao";

interface Saida extends SaidaResumo {
  clienteId: string;
  isca?: string | null;
  nome?: string | null;
  icone?: string | null;
  pendente?: boolean;
}

const nomeEspecie = (id: string) => ESPECIES[id as EspecieId]?.nome ?? id;

function Ficha({ rotulo, valor, cor, Icone, i }: { rotulo: string; valor: string; cor: string; Icone: typeof Fish; i: number }) {
  return (
    <div className="ficha aparece flex items-center gap-2.5 p-2.5" style={{ "--acento": cor, "--i": i } as CSSProperties}>
      <span className="icone-chip size-9">
        <Icone size={19} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[1.6rem] font-extrabold leading-none">{valor}</span>
        <span className="mt-0.5 block text-xs text-pedra">{rotulo}</span>
      </span>
    </div>
  );
}

export function Historico() {
  const [saidas, setSaidas] = useState<Saida[] | null>(null);
  const [compartilhado, setCompartilhado] = useState(true);
  const [nomes, setNomes] = useState<Record<string, string>>(Object.fromEntries(LOCAIS_PADRAO.map((l) => [l.id, l.nome])));

  useEffect(() => {
    (async () => {
      await enviarPendentes();
      let doServidor: Saida[] = [];
      try {
        const r = await fetch("/api/saidas");
        if (!r.ok) throw new Error();
        const j = await r.json();
        doServidor = j.saidas;
        setCompartilhado(j.configurado);
      } catch {
        setCompartilhado(false);
      }
      const ids = new Set(doServidor.map((s) => s.clienteId));
      const eu = lerPerfil();
      const locais = lerDiario()
        .filter((s) => !ids.has(s.clienteId))
        .map((s) => ({ ...s, nome: eu?.nome, icone: eu?.icone, pendente: true }));
      setSaidas([...locais, ...doServidor].sort((a, b) => `${b.data}${b.inicio}`.localeCompare(`${a.data}${a.inicio}`)));
      fetch("/api/locais")
        .then((r) => r.json())
        .then((j) => setNomes(Object.fromEntries(j.locais.map((l: { id: string; nome: string }) => [l.id, l.nome]))))
        .catch(() => {});
    })();
  }, []);

  if (!saidas) return <div role="status" aria-label="Carregando" className="h-60 animate-pulse rounded-2xl bg-sombra" />;

  const cpue = resumirCpue(saidas);
  const nomeLocal = (id: string) => nomes[id] ?? id;
  const totalPeixes = saidas.reduce((t, s) => t + s.capturas.reduce((a, c) => a + c.quantidade, 0), 0);
  const totalHoras = saidas.reduce((t, s) => t + horasDaSaida(s.inicio, s.fim), 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {saidas.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Resumo do grupo">
          <Ficha i={0} cor="#a9cb54" Icone={ListChecks} rotulo="Saídas" valor={String(saidas.length)} />
          <Ficha i={1} cor="#62d6d3" Icone={Fish} rotulo="Peixes" valor={String(totalPeixes)} />
          <Ficha i={2} cor="#f2a93b" Icone={Hourglass} rotulo="Horas de pesca" valor={fmt(totalHoras, 0)} />
          <Ficha i={3} cor="#ffd166" Icone={Tally5} rotulo="Peixes por hora" valor={fmt(totalHoras ? totalPeixes / totalHoras : 0, 2)} />
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:gap-8">
        <section aria-labelledby="titulo-saidas" className="revelar min-w-0 lg:order-2">
          <TituloSecao id="titulo-saidas" titulo="Saídas" Icone={Waves} cor="#62d6d3" />
          {!compartilhado && saidas.length > 0 && (
            <p className="mt-2.5 flex items-center gap-2 rounded-xl border border-barro/50 bg-terra px-3 py-2 text-sm">
              <CloudUpload size={18} className="shrink-0 text-barro" aria-hidden />
              Estas pescarias estão só neste aparelho.
            </p>
          )}
          {saidas.length ? (
            <ul className="mt-2.5 grid grid-cols-[minmax(0,1fr)] gap-2">
              {saidas.map((s, i) => {
                const total = s.capturas.reduce((a, c) => a + c.quantidade, 0);
                return (
                  <li key={s.clienteId} className="painel aparece flex items-center gap-3 p-3.5" style={{ "--i": Math.min(i, 8) } as CSSProperties}>
                    {s.icone && <Avatar icone={s.icone} tam={48} />}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <PeixeEspecie cor={corDaEspecie(s.especieAlvo)} tam={18} />
                        <span className="truncate">
                          {nomeEspecie(s.especieAlvo)} · {diaMes(s.data)}
                        </span>
                      </span>
                      {s.nome && <span className="block truncate text-sm">{s.nome}</span>}
                      <span className="block truncate text-xs text-pedra">
                        {nomeLocal(s.localId)} · {s.inicio}–{s.fim} ({fmt(horasDaSaida(s.inicio, s.fim))} h)
                      </span>
                      {s.isca && <span className="block truncate text-xs text-pedra">Isca: {s.isca}</span>}
                      {s.capturas.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {s.capturas.map((c) => (
                            <span key={c.especie} className="flex items-center gap-1 rounded-md bg-folha px-1.5 py-0.5 text-xs font-medium">
                              <PeixeEspecie cor={corDaEspecie(c.especie)} tam={14} />
                              {c.quantidade} {nomeEspecie(c.especie)}
                            </span>
                          ))}
                        </span>
                      )}
                      {s.pendente && <span className="mt-1 block font-mono text-xs uppercase tracking-wide text-barro">No aparelho</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-[2.1rem] font-black leading-none">{total}</span>
                      <span className="text-xs text-pedra">{total === 1 ? "peixe" : "peixes"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="painel mt-2.5 p-6 text-center">
              <Fish size={36} className="mx-auto text-rio-claro" aria-hidden />
              <p className="mt-2 text-sm text-pedra">Nenhuma pescaria registrada ainda.</p>
              <Link href="/registrar" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-boia px-4 font-bold text-white">
                Registrar a primeira
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="titulo-cpue" className="revelar min-w-0 lg:order-1">
          <TituloSecao id="titulo-cpue" titulo="Peixes por hora" Icone={BarChart3} cor="#ffd166" />
          {cpue.length ? (
            <>
              <div className="painel mt-2.5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-pedra">
                      <th className="px-3.5 py-2.5 font-medium">Espécie e local</th>
                      <th className="px-2 py-2.5 text-right font-medium">Saídas</th>
                      <th className="px-3.5 py-2.5 text-right font-medium">Peixes/h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpue.map((l) => (
                      <tr key={`${l.especie}${l.localId}`} className="border-t border-osso/10">
                        <td className="px-3.5 py-2.5">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <PeixeEspecie cor={corDaEspecie(l.especie)} tam={18} />
                            {nomeEspecie(l.especie)}
                          </span>
                          <span className="block text-xs text-pedra">{nomeLocal(l.localId)}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono">{l.saidas}</td>
                        <td className="px-3.5 py-2.5 text-right font-display text-2xl font-extrabold">{fmt(l.cpue, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-pedra">Com 150 a 200 saídas registradas, os pesos do índice podem ser ajustados com estes dados de Cerro Negro.</p>
            </>
          ) : (
            <p className="painel mt-2.5 p-4 text-sm text-pedra">O resumo aparece depois da primeira pescaria.</p>
          )}
        </section>
      </div>
    </div>
  );
}
