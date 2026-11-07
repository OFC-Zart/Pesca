"use client";

import { useEffect, useState, type FormEvent } from "react";
import { NOME_TIPO_AGUA, type TipoAgua } from "@/config/indice";
import { MEDICOES_PARA_CALIBRAR } from "@/config/indice";
import type { Local } from "@/lib/indice/tipos";

export function GerenciarLocais() {
  const [locais, setLocais] = useState<Local[] | null>(null);
  const [podeCadastrar, setPodeCadastrar] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoAgua>("acude");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

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
        body: JSON.stringify({ nome, tipo, lat: num(lat), lon: num(lon) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setMsg({ ok: true, texto: `${nome} cadastrado.` });
      setNome("");
      setLat("");
      setLon("");
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
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      <section aria-labelledby="titulo-lista" className="min-w-0">
        <h2 id="titulo-lista" className="rotulo mb-2">
          Pontos de pesca
        </h2>
        <ul className="painel divide-y divide-osso/8">
          {(locais ?? []).map((l) => (
            <li key={l.id} className="p-3.5">
              <span className="block font-semibold">{l.nome}</span>
              <span className="block font-mono text-xs text-pedra">
                {NOME_TIPO_AGUA[l.tipo]} · {l.lat.toFixed(3)}, {l.lon.toFixed(3)}
              </span>
              <span className="mt-1 block text-xs text-pedra">
                {l.calibA != null
                  ? `Água calibrada com ${l.calibN} medições de termômetro`
                  : `${l.calibN ?? 0} de ${MEDICOES_PARA_CALIBRAR} medições para calibrar a água`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-novo" className="min-w-0">
        <h2 id="titulo-novo" className="rotulo mb-2">
          Novo ponto
        </h2>
        {locais && !podeCadastrar ? (
          <p className="painel p-4 text-sm text-pedra">Para cadastrar pontos, o banco precisa estar ligado na Vercel. O passo a passo está no README.</p>
        ) : (
          <form onSubmit={enviar} className="painel grid gap-4 p-4">
            <label className="grid gap-1 text-sm font-medium">
              Nome
              <input required minLength={2} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} className="campo" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Tipo de água
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAgua)} className="campo">
                {(Object.keys(NOME_TIPO_AGUA) as TipoAgua[]).map((t) => (
                  <option key={t} value={t}>
                    {NOME_TIPO_AGUA[t]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Latitude
                <input required inputMode="text" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-27,80" className="campo" />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Longitude
                <input required inputMode="text" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-50,88" className="campo" />
              </label>
            </div>
            <button type="button" onClick={usarGps} className="min-h-11 rounded-lg border border-osso/20 text-sm font-semibold">
              Usar minha localização
            </button>
            {msg && (
              <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-broto/50 bg-folha" : "border-boia bg-sangue"}`}>
                {msg.texto}
              </p>
            )}
            <button className="min-h-12 rounded-xl bg-boia font-bold text-white hover:bg-boia-clara">Cadastrar ponto</button>
          </form>
        )}
      </section>
    </div>
  );
}
