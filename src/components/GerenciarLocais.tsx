"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Droplets, LocateFixed, MapPinPlus, Waves } from "lucide-react";
import { ALCANCE_KM, ESTACOES_ANA, REPRESAS, distanciaKm, maisPerto, represaMaisPerto } from "@/config/fontes";
import { MEDICOES_PARA_CALIBRAR, MEDICOES_PARA_RETA, NOME_TIPO_AGUA, type TipoAgua } from "@/config/indice";
import { MUNICIPIOS_AMURES } from "@/config/regiao";
import type { Local } from "@/lib/indice/tipos";
import { TituloSecao } from "./TituloSecao";

const km = (n: number) => `${Math.round(n)} km`;

/** Estações de nível da ANA, da mais perto para a mais longe. */
function estacoesPorDistancia(lat: number, lon: number) {
  return ESTACOES_ANA.filter((e) => e.nivel)
    .map((e) => ({ ...e, km: distanciaKm(lat, lon, e.lat, e.lon) }))
    .sort((a, b) => a.km - b.km);
}

function represasPorDistancia(lat: number, lon: number) {
  return REPRESAS.map((r) => ({ ...r, km: Math.min(...r.pontos.map(([la, lo]) => distanciaKm(lat, lon, la, lo))) })).sort((a, b) => a.km - b.km);
}

/** Escolha da estação do rio ou da represa. Vazio quer dizer "a mais perto", decidida na hora da conta. */
function SeletorFonteAgua({ tipo, lat, lon, valor, onMudar, rotulo = true }: { tipo: TipoAgua; lat: number; lon: number; valor: string; onMudar: (v: string) => void; rotulo?: boolean }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (tipo === "rio") {
    const lista = estacoesPorDistancia(lat, lon);
    const auto = maisPerto(lat, lon, ESTACOES_ANA.filter((e) => e.nivel), ALCANCE_KM.rio);
    return (
      <label className="grid gap-1 text-sm font-semibold">
        {rotulo && "Estação que mede o nível do rio (ANA)"}
        <select value={valor} onChange={(e) => onMudar(e.target.value)} className="campo">
          <option value="">{auto ? `A mais perto: ${auto.nome} · ${auto.rio} (${km(auto.km)})` : "Nenhuma a menos de 40 km"}</option>
          {lista.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome} · {e.rio} · {e.municipio} ({km(e.km)})
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (tipo === "represa") {
    const lista = represasPorDistancia(lat, lon);
    const auto = REPRESAS.find((r) => r.id === represaMaisPerto(lat, lon).id)!;
    return (
      <label className="grid gap-1 text-sm font-semibold">
        {rotulo && "Represa de usina (nível pelo ONS)"}
        <select value={valor} onChange={(e) => onMudar(e.target.value)} className="campo">
          <option value="">A mais perto: {auto.nome}</option>
          {lista.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome} · {r.rio} ({km(r.km)})
            </option>
          ))}
        </select>
      </label>
    );
  }
  return null;
}

export function GerenciarLocais() {
  const [locais, setLocais] = useState<Local[] | null>(null);
  const [podeCadastrar, setPodeCadastrar] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoAgua>("acude");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [profundidade, setProfundidade] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [fonteAgua, setFonteAgua] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function escolherMunicipio(nome: string) {
    setMunicipio(nome);
    const m = MUNICIPIOS_AMURES.find((x) => x.nome === nome);
    if (m) {
      setLat(String(m.lat).replace(".", ","));
      setLon(String(m.lon).replace(".", ","));
    }
  }

  async function editarFonte(l: Local, valor: string) {
    const campo = l.tipo === "rio" ? "estacao" : "represa";
    try {
      const r = await fetch("/api/locais", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: l.id, [campo]: valor || null }),
      });
      if (!r.ok) throw new Error((await r.json()).erro);
      void carregar();
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : "Não foi possível salvar." });
    }
  }

  const carregar = () =>
    fetch("/api/locais")
      .then((r) => r.json())
      .then((j) => {
        setLocais(j.locais);
        setPodeCadastrar(j.podeCadastrar);
      })
      .catch(() => setLocais([]));

  useEffect(() => {
    void carregar();
  }, []);

  const num = (s: string) => Number(s.replace(",", "."));

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setMsg(null);
    try {
      const r = await fetch("/api/locais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          tipo,
          lat: num(lat),
          lon: num(lon),
          profundidade: profundidade.trim() ? num(profundidade) : undefined,
          estacao: tipo === "rio" && fonteAgua ? fonteAgua : undefined,
          represa: tipo === "represa" && fonteAgua ? fonteAgua : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setMsg({ ok: true, texto: `${nome} cadastrado.` });
      setNome("");
      setLat("");
      setLon("");
      setProfundidade("");
      setMunicipio("");
      setFonteAgua("");
      void carregar();
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : "Não foi possível cadastrar." });
    }
  }

  function usarGps() {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(5));
        setLon(p.coords.longitude.toFixed(5));
      },
      () => setMsg({ ok: false, texto: "Não foi possível pegar a localização. Digite as coordenadas." }),
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-2 lg:gap-8">
      <section aria-labelledby="titulo-lista" className="min-w-0">
        <TituloSecao id="titulo-lista" titulo="Pontos de pesca" Icone={Waves} cor="#62d6d3" />
        <ul className="painel mt-2.5 divide-y divide-osso/10">
          {(locais ?? []).map((l) => {
            const medidas = Math.min(l.calibN ?? 0, MEDICOES_PARA_RETA);
            return (
              <li key={l.id} className="flex gap-3 p-3.5" style={{ "--acento": "#62d6d3" } as React.CSSProperties}>
                <span className="icone-chip size-10">
                  <Droplets size={20} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold">{l.nome}</span>
                  <span className="block font-mono text-xs text-pedra">
                    {NOME_TIPO_AGUA[l.tipo]}
                    {l.profundidade ? ` · ${l.profundidade} m` : ""} · {l.lat.toFixed(3)}, {l.lon.toFixed(3)}
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-terra">
                    <span className="barra block h-full rounded-full bg-rio-claro" style={{ width: `${(medidas / MEDICOES_PARA_RETA) * 100}%` }} />
                  </span>
                  <span className="mt-1 block text-xs text-pedra">
                    {l.calibA != null ? `Água calibrada com ${l.calibN} medições de termômetro. Quanto mais, melhor.` : `${l.calibN ?? 0} de ${MEDICOES_PARA_CALIBRAR} medições para calibrar a água deste ponto`}
                  </span>
                  {podeCadastrar && (l.tipo === "rio" || l.tipo === "represa") && (
                    <div className="mt-2 text-xs">
                      <span className="text-pedra">{l.tipo === "rio" ? "Nível do rio medido em:" : "Represa:"}</span>
                      <SeletorFonteAgua tipo={l.tipo} lat={l.lat} lon={l.lon} valor={(l.tipo === "rio" ? l.estacao : l.represa) ?? ""} onMudar={(v) => void editarFonte(l, v)} rotulo={false} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="titulo-novo" className="min-w-0">
        <TituloSecao id="titulo-novo" titulo="Novo ponto" Icone={MapPinPlus} cor="#a9cb54" />
        {locais && !podeCadastrar ? (
          <p className="painel mt-2.5 p-4 text-sm text-pedra">Para cadastrar pontos, o banco precisa estar ligado na Vercel. O passo a passo está no README.</p>
        ) : (
          <form onSubmit={enviar} className="painel mt-2.5 grid gap-4 p-4">
            <label className="grid gap-1 text-sm font-semibold">
              Nome
              <input required minLength={2} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} className="campo" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Tipo de água
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as TipoAgua);
                  setFonteAgua("");
                }}
                className="campo"
              >
                {(Object.keys(NOME_TIPO_AGUA) as TipoAgua[]).map((t) => (
                  <option key={t} value={t}>
                    {NOME_TIPO_AGUA[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              <span>
                Município da Serra <span className="font-normal text-pedra">(preenche as coordenadas do centro)</span>
              </span>
              <select value={municipio} onChange={(e) => escolherMunicipio(e.target.value)} className="campo">
                <option value="">Escolha, ou use o GPS abaixo</option>
                {MUNICIPIOS_AMURES.map((m) => (
                  <option key={m.nome} value={m.nome}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Latitude
                <input required inputMode="text" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-27,80" className="campo" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Longitude
                <input required inputMode="text" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-50,88" className="campo" />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              <span>
                Profundidade média em metros <span className="font-normal text-pedra">(opcional)</span>
              </span>
              <input inputMode="decimal" value={profundidade} onChange={(e) => setProfundidade(e.target.value)} placeholder="Ex.: 2,5" className="campo" />
              <span className="font-normal text-pedra">Açude raso muda de temperatura rápido; fundo, devagar. Ajuda a acertar a água.</span>
            </label>
            <SeletorFonteAgua tipo={tipo} lat={lat.trim() ? num(lat) : NaN} lon={lon.trim() ? num(lon) : NaN} valor={fonteAgua} onMudar={setFonteAgua} />
            <button type="button" onClick={usarGps} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-osso/25 text-sm font-semibold hover:bg-osso/5">
              <LocateFixed size={18} className="text-rio-claro" aria-hidden /> Usar minha localização
            </button>
            {msg && (
              <p role="status" className={`rounded-xl border px-3 py-2 text-sm ${msg.ok ? "border-broto/50 bg-folha" : "border-boia bg-sangue"}`}>
                {msg.texto}
              </p>
            )}
            <button className="min-h-12 rounded-2xl bg-boia font-bold text-white hover:bg-boia-clara">Cadastrar ponto</button>
          </form>
        )}
      </section>
    </div>
  );
}
