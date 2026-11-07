"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { PEIXE_PADRAO, type PeixeId } from "@/config/peixes";
import { esquecerPerfil, gravarPerfil, lerPerfil, type PerfilLocal } from "@/lib/armazem";
import { Avatar } from "./Avatar";
import { Convite } from "./Convite";
import { SeletorPeixe } from "./SeletorPeixe";

export function Perfil() {
  const [perfil, setPerfil] = useState<PerfilLocal | null>(null);
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState<PeixeId>(PEIXE_PADRAO);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mostrar = (p: PerfilLocal) => {
    setPerfil(p);
    setNome(p.nome);
    setIcone(p.icone as PeixeId);
  };

  useEffect(() => {
    const salvo = lerPerfil();
    if (salvo) mostrar(salvo);
    fetch("/api/perfil")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p) {
          mostrar(p);
          gravarPerfil(p);
        }
      })
      .catch(() => {});
  }, []);

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, icone }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      mostrar(j);
      gravarPerfil(j);
      setMsg({ ok: true, texto: "Perfil salvo." });
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : "Sem conexão. Tente de novo." });
    }
    setEnviando(false);
  }

  async function sair() {
    try {
      const r = await fetch("/api/sair", { method: "POST" });
      if (!r.ok) throw new Error();
      esquecerPerfil();
      window.location.href = "/entrar";
    } catch {
      setMsg({ ok: false, texto: "Sem conexão. Tente sair quando o sinal voltar." });
    }
  }

  if (!perfil) return <div role="status" aria-label="Carregando" className="h-60 animate-pulse rounded-[14px] bg-sombra" />;

  return (
    <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex items-center gap-4">
        <Avatar icone={icone} tam={88} />
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tight break-words">{perfil.nome}</h1>
          <p className="mt-1 truncate font-mono text-sm text-pedra">@{perfil.usuario}</p>
        </div>
      </div>

      <form onSubmit={salvar} className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <label className="grid gap-1 text-sm font-medium">
          Seu nome
          <input required minLength={2} maxLength={30} value={nome} onChange={(e) => setNome(e.target.value)} className="campo" />
        </label>
        <SeletorPeixe valor={icone} onMudar={setIcone} />
        {msg && (
          <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-broto/50 bg-folha" : "border-boia bg-sangue"}`}>
            {msg.texto}
          </p>
        )}
        <button disabled={enviando} className="min-h-14 rounded-xl bg-boia text-base font-bold text-white transition-colors hover:bg-boia-clara disabled:opacity-60">
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </form>

      <Convite />

      <button onClick={sair}className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-osso/20 font-semibold hover:bg-osso/5">
        <LogOut size={18} aria-hidden /> Sair deste aparelho
      </button>
    </div>
  );
}
