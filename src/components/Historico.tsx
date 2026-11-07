"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloudUpload, Fish } from "lucide-react";
import { ESPECIES, LOCAIS_PADRAO, type EspecieId } from "@/config/indice";
import { enviarPendentes, lerDiario, lerPerfil } from "@/lib/armazem";
import { resumirCpue, horasDaSaida, type SaidaResumo } from "@/lib/cpue";
import { diaMes } from "@/lib/formato";
import { fmt } from "@/lib/indice/calculo";
import { Avatar } from "./Avatar";

interface Saida extends SaidaResumo {
  clienteId: string;
  isca?: string | null;
  nome?: string | null;
  icone?: string | null;
  pendente?: boolean;
}

const nomeEspecie = (id: string) => ESPECIES[id as EspecieId]?.nome ?? id;

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

  if (!saidas) return <div role="status" aria-label="Carregando" className="h-60 animate-pulse rounded-[14px] bg-sombra" />;

  const cpue = resumirCpue(saidas);
  const nomeLocal = (id: string) => nomes[id] ?? id;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:gap-8">
      <section aria-labelledby="titulo-cpue" className="min-w-0">
        <h2 id="titulo-cpue" className="rotulo mb-2">
          Peixes por hora
        </h2>
        {cpue.length ? (
          <>
            <div className="painel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-pedra">
                    <th className="px-3.5 py-2.5 font-normal">Espécie e local</th>
                    <th className="px-2 py-2.5 text-right font-normal">Saídas</th>
                    <th className="px-3.5 py-2.5 text-right font-normal">Peixes/h</th>
                  </tr>
                </thead>
                <tbody>
                  {cpue.map((l) => (
                    <tr key={`${l.especie}${l.localId}`} className="border-t border-osso/8">
                      <td className="px-3.5 py-2.5">
                        <span className="font-semibold">{nomeEspecie(l.especie)}</span>
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
          <p className="painel p-4 text-sm text-pedra">O resumo aparece depois da primeira pescaria.</p>
        )}
      </section>

      <section aria-labelledby="titulo-saidas" className="min-w-0">
        <h2 id="titulo-saidas" className="rotulo mb-2">
          Saídas
        </h2>
        {!compartilhado && saidas.length > 0 && (
          <p className="mb-2 flex items-center gap-2 rounded-lg border border-barro/40 bg-terra/80 px-3 py-2 text-sm">
            <CloudUpload size={16} className="shrink-0 text-barro" aria-hidden />
            Estas pescarias estão só neste aparelho.
          </p>
        )}
        {saidas.length ? (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {saidas.map((s) => {
              const total = s.capturas.reduce((a, c) => a + c.quantidade, 0);
              return (
                <li key={s.clienteId} className="painel flex items-center gap-3 p-3.5">
                  {s.icone && <Avatar icone={s.icone} tam={44} />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {diaMes(s.data)} · {nomeEspecie(s.especieAlvo)}
                    </span>
                    <span className="block truncate text-xs text-pedra">
                      {nomeLocal(s.localId)} · {s.inicio}–{s.fim} ({fmt(horasDaSaida(s.inicio, s.fim))} h)
                    </span>
                    {(s.isca || s.nome) && (
                      <span className="block truncate text-xs text-pedra">{[s.nome, s.isca && `isca: ${s.isca}`].filter(Boolean).join(" · ")}</span>
                    )}
                    {s.capturas.length > 0 && (
                      <span className="mt-1 block text-xs">{s.capturas.map((c) => `${c.quantidade} ${nomeEspecie(c.especie)}`).join(", ")}</span>
                    )}
                    {s.pendente && <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-barro">No aparelho</span>}
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-3xl font-black leading-none">{total}</span>
                    <span className="text-[11px] text-pedra">{total === 1 ? "peixe" : "peixes"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="painel p-6 text-center">
            <Fish size={32} className="mx-auto text-musgo" aria-hidden />
            <p className="mt-2 text-sm text-pedra">Nenhuma pescaria registrada ainda.</p>
            <Link href="/registrar" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-boia px-4 font-bold text-white">
              Registrar a primeira
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
