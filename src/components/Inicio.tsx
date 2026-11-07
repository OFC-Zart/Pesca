"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CloudOff, Info, MapPin, PlusCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { AVISO_DOURADO, ESPECIES, ESPECIE_IDS, LOCAIS_PADRAO, type EspecieId } from "@/config/indice";
import { gravarPrevisao, lerPrevisao, prefs } from "@/lib/armazem";
import { momentoDoDia, posicaoNoCeu } from "@/lib/cena";
import { agoraEmCerroNegro, diaLongo, diaMes, diaSemana, horaDoIso } from "@/lib/formato";
import { fmt } from "@/lib/indice/calculo";
import type { DiaPrevisao, Previsao } from "@/lib/indice/tipos";
import { COR_ESPECIE } from "@/lib/visual";
import { CapimHoras } from "./CapimHoras";
import { CenaRio, type DadosCenario } from "./CenaRio";
import { Fatores } from "./Fatores";
import { FileiraDias, type ResumoDia } from "./FileiraDias";
import { IconeLua } from "./IconeLua";
import { PeixeEspecie } from "./Peixes";
import { Ranking, ordenarEspecies } from "./Ranking";
import { ResumoRapido } from "./ResumoRapido";
import { SeloOrigem } from "./Selos";
import { FONTES_VAZIAS } from "@/lib/indice/previsao-vazia";

type Filtro = EspecieId | "todas";
const UMA_HORA = 3600_000;
const CINCO_MINUTOS = 300_000;

export function Inicio() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [localId, setLocalId] = useState<string>(LOCAIS_PADRAO[0].id);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [semSinal, setSemSinal] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [data, setData] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [relogio, setRelogio] = useState(0);

  useEffect(() => {
    const e = prefs.especie();
    if (e === "todas" || (e && e in ESPECIES)) setFiltro(e as Filtro);
    const l = prefs.local();
    if (l) setLocalId(l);
    setPronto(true);
    // O céu e o marcador de "agora" acompanham o relógio.
    const t = setInterval(() => setRelogio((r) => r + 1), CINCO_MINUTOS);
    return () => clearInterval(t);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const agora = useMemo(() => agoraEmCerroNegro(), [previsao, relogio]);
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
      <label className="flex min-w-0 items-center gap-2 rounded-xl border border-osso/20 bg-sombra pl-3 sm:max-w-sm">
        <MapPin size={18} className="shrink-0 text-rio-claro" aria-hidden />
        <span className="sr-only">Local</span>
        <select
          value={localId}
          onChange={(e) => escolherLocal(e.target.value)}
          className="min-h-12 w-full min-w-0 truncate bg-transparent pr-2 text-sm font-semibold focus:outline-none [&>option]:bg-mata"
        >
          {locais.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </select>
      </label>

      <div className="sem-barra borda-fade -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5" role="group" aria-label="Filtrar por espécie">
        {(["todas", ...ESPECIE_IDS] as Filtro[]).map((f) => {
          const ativo = filtro === f;
          const cor = f === "todas" ? "#c9e96b" : COR_ESPECIE[f];
          return (
            <button
              key={f}
              onClick={() => escolherFiltro(f)}
              aria-pressed={ativo}
              style={ativo ? { backgroundColor: cor, borderColor: cor } : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-[scale] active:scale-95 ${
                ativo ? "text-breu" : "border-osso/20 bg-sombra text-osso hover:border-osso/40"
              }`}
            >
              {f !== "todas" && <PeixeEspecie cor={ativo ? "#10160e" : cor} tam={18} />}
              {f === "todas" ? "Todas" : ESPECIES[f].nome}
            </button>
          );
        })}
      </div>

      {semSinal && (
        <p className="flex items-center gap-2 rounded-xl border border-barro/50 bg-terra px-3 py-2 text-sm">
          <CloudOff size={18} className="shrink-0 text-barro" aria-hidden />
          {previsao ? `Sem conexão com o clima. Mostrando a previsão das ${horaDoIso(previsao.atualizadoEm)}.` : "Sem conexão e nenhuma previsão guardada ainda."}
          <button onClick={() => void buscar(localId)} className="ml-auto flex shrink-0 items-center gap-1 font-semibold underline underline-offset-2">
            <RefreshCw size={14} aria-hidden /> Tentar
          </button>
        </p>
      )}

      {!previsao && carregando && <Esqueleto />}

      {dia && especieVisivel && (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 lg:sticky lg:top-[72px]">
            <CenaDoDia dia={dia} filtro={filtro} especie={especieVisivel} hoje={agora.data} horaDecimal={agora.hora + agora.minuto / 60} />
            {especieVisivel === "dourado" && (
              <p className="flex items-start gap-2 rounded-xl border border-boia/60 bg-sangue px-3 py-2 text-sm">
                <TriangleAlert size={18} className="mt-px shrink-0 text-boia-clara" aria-hidden />
                {AVISO_DOURADO}
              </p>
            )}
            <ResumoRapido dia={dia} especie={especieVisivel} horaAgora={horaAgora} />
            {/* No celular, o botão de registrar fica na barra de baixo. */}
            <Link
              href="/registrar"
              className="hidden min-h-14 items-center justify-center gap-2 rounded-2xl bg-boia text-base font-bold text-white transition-colors hover:bg-boia-clara md:flex"
            >
              <PlusCircle size={20} aria-hidden /> Registrar pescaria
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
            {filtro === "todas" ? (
              <Ranking dia={dia} horaAgora={horaAgora} onEscolher={escolherFiltro} />
            ) : dia.especies[filtro].horas ? (
              <CapimHoras horas={dia.especies[filtro].horas!} astro={dia.astro} horaAgora={horaAgora} inseguras={dia.horasInseguras} especie={filtro} />
            ) : (
              <p className="painel flex items-start gap-2 p-4 text-sm text-pedra">
                <Info size={18} className="mt-px shrink-0 text-rio-claro" aria-hidden />
                {dia.fase === "faixa"
                  ? "O hora a hora só vale para os 3 primeiros dias. Daqui para a frente, a nota aparece em faixa."
                  : "Para tão longe, o clima é só tendência. Dá para confiar na lua e na média da água, não em nota fechada."}
              </p>
            )}

            <FileiraDias dias={resumo} selecionado={dia.data} hoje={agora.data} onSelecionar={setData} />

            {filtro !== "todas" && (
              <Fatores dia={dia} especie={filtro} nota={dia.especies[filtro]} local={previsao!.local} fontes={previsao!.fontes ?? FONTES_VAZIAS} ehHoje={dia.data === agora.data} />
            )}

            {previsao && <RodapeFontes previsao={previsao} />}
          </div>
        </div>
      )}
    </div>
  );
}

function CenaDoDia({ dia, filtro, especie, hoje, horaDecimal }: { dia: DiaPrevisao; filtro: Filtro; especie: EspecieId; hoje: string; horaDecimal: number }) {
  const n = dia.especies[especie];
  const ehHoje = dia.data === hoje;
  const quando = ehHoje ? `Hoje · ${diaMes(dia.data)}` : diaLongo(dia.data);
  // Hoje o céu segue o relógio; nos outros dias, o desenho mostra a manhã.
  const hora = ehHoje ? horaDecimal : 9;
  const cenario: DadosCenario = {
    momento: momentoDoDia(hora, dia.astro),
    posicao: posicaoNoCeu(hora, dia.astro),
    astro: dia.astro,
    nuvens: dia.brutos.nuvens,
    chuva48h: dia.brutos.chuva48h,
  };

  if (dia.fase === "tendencia") {
    return (
      <CenaRio
        kicker={quando}
        titulo={ESPECIES[especie].nome}
        selos={<SeloOrigem id={especie} />}
        cor={COR_ESPECIE[especie]}
        nota={null}
        motivo={`Água perto de ${fmt(dia.brutos.tempAgua, 0)} °C, com ótimo de ${ESPECIES[especie].otMin}–${ESPECIES[especie].otMax} °C para esta espécie.`}
        cenario={cenario}
        rodape={
          <p className="mt-2.5 flex items-center gap-2 text-sm text-osso/90">
            <IconeLua astro={dia.astro} /> Lua {Math.round(dia.astro.iluminacao * 100)}% iluminada
          </p>
        }
      />
    );
  }
  return (
    <CenaRio
      kicker={filtro === "todas" ? `Melhor aposta · ${ehHoje ? "hoje" : `${diaSemana(dia.data)} ${diaMes(dia.data)}`}` : quando}
      titulo={ESPECIES[especie].nome}
      selos={<SeloOrigem id={especie} />}
      cor={COR_ESPECIE[especie]}
      nota={n.nota}
      min={n.min}
      max={n.max}
      motivo={n.motivo}
      confianca={dia.confianca}
      bloqueio={dia.bloqueio}
      cenario={cenario}
    />
  );
}

/** Quando a previsão foi feita, com quantas fontes, e o aviso discreto quando alguma falhou. */
function RodapeFontes({ previsao }: { previsao: Previsao }) {
  const f = previsao.fontes ?? FONTES_VAZIAS;
  const partes = [
    `Atualizado às ${horaDoIso(previsao.atualizadoEm)}.`,
    f.modelos ? `Média de ${f.modelos} modelos${f.pesos === "precisao" ? " com peso pela precisão" : ""}${f.correcaoVies ? " e correção de viés" : ""}.` : null,
    previsao.fonteConfianca === "ensemble" ? "Confiança com 31 cenários do tempo." : "Confiança pela distância do dia.",
  ].filter(Boolean);
  return (
    <div className="grid gap-1.5 text-xs text-pedra">
      <p className="flex items-start gap-1.5">
        <RefreshCw size={13} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          {partes.join(" ")}{" "}
          <Link href="/fontes" className="font-semibold text-osso/85 underline underline-offset-2">
            Fontes e precisão
          </Link>
        </span>
      </p>
      {f.avisos.length > 0 && (
        <p className="flex items-start gap-1.5 text-barro">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>{f.avisos.join(" ")}</span>
        </p>
      )}
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="grid gap-4 lg:grid-cols-[5fr_6fr]" aria-label="Carregando a previsão" role="status">
      <div className="h-[460px] animate-pulse rounded-[20px] bg-sombra" />
      <div className="h-[320px] animate-pulse rounded-2xl bg-sombra" />
    </div>
  );
}
