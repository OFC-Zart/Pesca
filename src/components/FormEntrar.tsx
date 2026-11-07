"use client";

import { useState, type FormEvent } from "react";

export function FormEntrar() {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      if (r.ok) {
        // Recarga completa: o service worker só se instala depois de entrar.
        window.location.href = "/";
        return;
      }
      const j = await r.json().catch(() => null);
      setErro(j?.erro ?? "Não foi possível entrar. Tente de novo.");
    } catch {
      setErro("Sem conexão. Tente de novo quando o sinal voltar.");
    }
    setEnviando(false);
  }

  return (
    <form onSubmit={enviar} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium">
        Código de acesso
        <input
          required
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? "erro-codigo" : undefined}
          className="campo text-center font-mono tracking-wide"
        />
      </label>
      {erro && (
        <p id="erro-codigo" role="alert" className="rounded-lg border border-boia bg-sangue px-3 py-2 text-sm">
          {erro}
        </p>
      )}
      <button disabled={enviando} className="min-h-14 rounded-xl bg-boia text-base font-bold text-white transition-colors hover:bg-boia-clara disabled:opacity-60">
        {enviando ? "Conferindo…" : "Entrar"}
      </button>
    </form>
  );
}
