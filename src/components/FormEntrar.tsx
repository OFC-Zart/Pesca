"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PEIXE_PADRAO, type PeixeId } from "@/config/peixes";
import { SeletorPeixe } from "./SeletorPeixe";

type Modo = "entrar" | "criar";

function CampoSenha(p: { valor: string; onMudar: (v: string) => void; autoComplete: string; dica?: string }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="grid gap-1 text-sm font-medium">
      Senha
      <span className="relative block">
        <input
          required
          name="password"
          type={ver ? "text" : "password"}
          value={p.valor}
          onChange={(e) => p.onMudar(e.target.value)}
          autoComplete={p.autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="campo pr-12"
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Esconder a senha" : "Mostrar a senha"}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-pedra hover:text-osso"
        >
          {ver ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </span>
      {p.dica && <span className="font-normal text-pedra">{p.dica}</span>}
    </label>
  );
}

export function FormEntrar() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [icone, setIcone] = useState<PeixeId>(PEIXE_PADRAO);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const trocarModo = (m: Modo) => {
    setModo(m);
    setErro(null);
  };

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch(modo === "entrar" ? "/api/entrar" : "/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modo === "entrar" ? { usuario, senha } : { nome, usuario, senha, icone, codigo }),
      });
      if (r.ok) {
        // Recarga completa: o service worker só se instala depois de entrar.
        window.location.href = "/";
        return;
      }
      const j = await r.json().catch(() => null);
      setErro(j?.erro ?? "Não foi possível continuar. Tente de novo.");
    } catch {
      setErro("Sem conexão. Tente de novo quando o sinal voltar.");
    }
    setEnviando(false);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-osso/15 bg-sombra/85 p-1" role="group" aria-label="Escolha entrar ou criar conta">
        {(["entrar", "criar"] as Modo[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={modo === m}
            onClick={() => trocarModo(m)}
            className={`min-h-11 rounded-lg text-sm font-semibold transition-colors ${modo === m ? "bg-brotinho text-breu" : "text-osso hover:bg-osso/5"}`}
          >
            {m === "entrar" ? "Já tenho conta" : "Criar conta"}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {modo === "criar" && (
          <label className="grid gap-1 text-sm font-medium">
            Seu nome
            <input required minLength={2} maxLength={30} name="name" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como o grupo te chama" className="campo" />
          </label>
        )}

        <label className="grid gap-1 text-sm font-medium">
          Usuário
          <input
            required
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="campo"
          />
          {modo === "criar" && <span className="font-normal text-pedra">3 a 20 letras ou números, sem espaço nem acento.</span>}
        </label>

        <CampoSenha valor={senha} onMudar={setSenha} autoComplete={modo === "entrar" ? "current-password" : "new-password"} dica={modo === "criar" ? "Pelo menos 6 caracteres. Não use a senha de outro lugar." : undefined} />

        {modo === "criar" && (
          <>
            <SeletorPeixe valor={icone} onMudar={setIcone} />
            <label className="grid gap-1 text-sm font-medium">
              Código do grupo
              <input
                required
                name="codigo-grupo"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="campo font-mono"
              />
              <span className="font-normal text-pedra">Só precisa dele agora. Peça para quem te passou o link.</span>
            </label>
          </>
        )}

        {erro && (
          <p role="alert" className="rounded-lg border border-boia bg-sangue px-3 py-2 text-sm">
            {erro}
          </p>
        )}

        <button disabled={enviando} className="min-h-14 rounded-xl bg-boia text-base font-bold text-white transition-colors hover:bg-boia-clara disabled:opacity-60">
          {enviando ? "Conferindo…" : modo === "entrar" ? "Entrar" : "Criar conta e entrar"}
        </button>
      </form>
    </div>
  );
}
