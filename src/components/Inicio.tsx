"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CloudOff, MapPin, PlusCircle, RefreshCw } from "lucide-react";
import { AVISO_DOURADO, ESPECIES, ESPECIE_IDS, LEGENDA_PERIODO, LOCAIS_PADRAO, type EspecieId } from "@/config/indice";
import { gravarPrevisao, lerPrevisao, prefs } from "@/lib/armazem";
import { agoraEmCerroNegro, diaLongo, diaMes, diaSemana, horaDoIso } from "@/lib/formato";
import { fmt } from "@/lib/indice/calculo";
import type { DiaPrevisao, Previsao } from "@/lib/indice/tipos";
import { CapimHoras } from "./CapimHoras";
import { CenaBoia } from "./CenaBoia";
import { Fatores } from "./Fatores";
import { FileiraDias, type ResumoDia } from "./FileiraDias";
import { IconeLua } from "./IconeLua";
import { Ranking, ordenarEspecies } from "./Ranking";
import { SeloOrigem } from "./Selos";

type Filtro = EspecieId | "todas";
const UMA_HORA = 3600_000;

export function Inicio() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [localId, setLocalId] = useState<string>(LOCAIS_PADRAO[0].id);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [semSinal, setSemSinal] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [data, setData] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const e = prefs.especie();
    if (e === "todas" || (e && e in ESPECIES)) setFiltro(e as Filtro);
    const l = prefs.local();
    if (l) setLocalId(l);
    setPronto(true);
  }, []);

  const buscar = useCallback(async (id: string) => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/indice?local=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(String(r.status));
      const p: Previsao = await r.json();
      setPrevisao(p);
      setSemSinal(false);
      gravarPrevisao(id, p);
    } catch {
      setPrevisao(lerPrevisao(id));
      setSemSinal(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!pronto) return;
    // Mostra a última previsão guardada na hora e atualiza por cima.
    const salva = lerPrevisao(localId);
    if (salva) setPrevisao(salva);
    void buscar(localId);
    const t = setInterval(() => void buscar(localId), UMA_HORA);
    return () => clearInterval(t);
  }, [pronto, localId, buscar]);

  const agora = useMemo(() => agoraEmCerroNegro(), [previsao]);
  const dias = useMemo(() => previsao?.dias.filter((d) => d.data >= agora.data) ?? [], [previsao, agora.data]);
  const dia: DiaPrevisao | undefined = dias.find((d) => d.data === data) ?? dias[0];
  const horaAgora = dia?.data === agora.data ? agora.hora : null;

  const escolherFiltro = (f: Filtro) => {
    setFiltro(f);
    prefs.setEspecie(f);
  };
  const escolherLocal = (id: string) => {
    setLocalId(id);
    prefs.setLocal(id);
  };

  const resumo: ResumoDia[] = dias.map((d) => {
    const id = filtro === "todas" ? ordenarEspecies(d)[0] : filtro;
    const n = d.especies[id];
    return { dia: d, nota: n.nota, min: n.min, max: n.max };
  });

  const especieVisivel = dia ? (filtro === "todas" ? ordenarEspecies(dia)[0] : filtro) : null;
  const locais = previsao?.locais ?? LOCAIS_PADRAO;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex items-center justify-between gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-osso/15 bg-sombra/85 pl-3 sm:max-w-sm">
          <MapPin size={16} className="shrink-0 text-boia-clara" aria-hidden />
          <span className="sr-only">Local</span>
          <select
            value={localId}
            onChange={(e) => escolherLocal(e.target.value)}
            className="min-h-11 w-full min-w-0 truncate bg-transparent pr-2 text-sm font-medium focus:outline-none [&>option]:bg-mata"
          >
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </label>
        <Link href="/locais" className="shrink-0 py-3 text-xs text-pedra underline underline-offset-2 hover:text-osso">
          Locais
        </Link>
      </div>

      <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5" role="group" aria-label="Filtrar por espécie">
        {(["todas", ...ESPECIE_IDS] as Filtro[]).map((f) => {
          const ativo = filtro === f;
          return (
            <button
              key={f}
              onClick={() => escolherFiltro(f)}
              aria-pressed={ativo}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
                ativo ? "border-brotinho bg-brotinho text-breu" : "border-osso/15 bg-sombra/85 text-osso hover:border-osso/35"
              }`}
            >
              {f === "todas" ? "Todas" : ESPECIES[f].nome}
            </button>
          );
        })}
      </div>

      {semSinal && (
        <p className="flex items-center gap-2 rounded-lg border border-barro/40 bg-terra/80 px-3 py-2 text-sm">
          <CloudOff size={16} className="shrink-0 text-barro" aria-hidden />
          {previsao ? `Sem conexão com o clima. Mostrando a previsão das ${horaDoIso(previsao.atualizadoEm)}.` : "Sem conexão e nenhuma previsão guardada ainda."}
          <button onClick={() => void buscar(localId)} className="ml-auto flex shrink-0 items-center gap-1 font-medium underline underline-offset-2">
            <RefreshCw size={14} aria-hidden /> Tentar
          </button>
        </p>
      )}

      {!previsao && carregando && <Esqueleto />}

      {dia && especieVisivel && (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
            <CenaDoDia dia={dia} filtro={filtro} especie={especieVisivel} hoje={agora.data} />
            {especieVisivel === "dourado" && (
              <p className="rounded-lg border border-boia/50 bg-sangue/70 px-3 py-2 text-sm">{AVISO_DOURADO}</p>
            )}
            <Link
              href="/registrar"
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-boia text-base font-bold text-white transition-colors hover:bg-boia-clara"
            >
              <PlusCircle size={20} aria-hidden /> Registrar pescaria
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
            {filtro === "todas" ? (
              <Ranking dia={dia} horaAgora={horaAgora} onEscolher={escolherFiltro} />
            ) : dia.especies[filtro].horas ? (
              <CapimHoras horas={dia.especies[filtro].horas!} astro={dia.astro} horaAgora={horaAgora} inseguras={dia.horasInseguras} />
            ) : (
              <p className="painel p-4 text-sm text-pedra">
                {dia.fase === "faixa"
                  ? "O hora a hora só vale para os 3 primeiros dias. Daqui para a frente, a nota aparece em faixa."
                  : "Para tão longe, o clima é só tendência. Dá para confiar na lua e na média da água, não em nota fechada."}
              </p>
            )}

            <FileiraDias dias={resumo} selecionado={dia.data} hoje={agora.data} onSelecionar={setData} />

            {filtro !== "todas" && (
              <Fatores dia={dia} especie={filtro} fatores={dia.especies[filtro].fatores} local={previsao!.local} />
            )}

            {previsao && (
              <p className="text-xs text-pedra">
                Atualizado às {horaDoIso(previsao.atualizadoEm)} ·{" "}
                {previsao.fonteConfianca === "ensemble" ? "Confiança por 31 cenários do tempo" : "Confiança estimada pela distância do dia"}. Nem o clima certo garante peixe.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CenaDoDia({ dia, filtro, especie, hoje }: { dia: DiaPrevisao; filtro: Filtro; especie: EspecieId; hoje: string }) {
  const n = dia.especies[especie];
  const quando = dia.data === hoje ? `Hoje · ${diaMes(dia.data)}` : diaLongo(dia.data);

  if (dia.fase === "tendencia") {
    return (
      <CenaBoia
        kicker={quando}
        titulo={ESPECIES[especie].nome}
        selos={<SeloOrigem id={especie} />}
        nota={null}
        motivo={`Água perto de ${fmt(dia.brutos.tempAgua, 0)} °C, com ótimo de ${ESPECIES[especie].otMin}–${ESPECIES[especie].otMax} °C para esta espécie.`}
        rodape={
          <p className="mt-3 flex items-center gap-2 text-sm text-osso/85">
            <IconeLua astro={dia.astro} /> Lua {Math.round(dia.astro.iluminacao * 100)}% iluminada
          </p>
        }
      />
    );
  }
  return (
    <CenaBoia
      kicker={filtro === "todas" ? `Melhor aposta · ${dia.data === hoje ? "hoje" : `${diaSemana(dia.data)} ${diaMes(dia.data)}`}` : `${quando} · ${LEGENDA_PERIODO[ESPECIES[especie].periodo]}`}
      titulo={ESPECIES[especie].nome}
      selos={<SeloOrigem id={especie} />}
      nota={n.nota}
      min={n.min}
      max={n.max}
      motivo={n.motivo}
      confianca={dia.confianca}
      bloqueio={dia.bloqueio}
    />
  );
}

function Esqueleto() {
  return (
    <div className="grid gap-4 lg:grid-cols-[5fr_6fr]" aria-label="Carregando a previsão" role="status">
      <div className="h-[400px] animate-pulse rounded-[18px] bg-sombra" />
      <div className="h-[300px] animate-pulse rounded-[14px] bg-sombra" />
    </div>
  );
}
