"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, Users } from "lucide-react";
import { SITE } from "@/config/site";
import { TituloSecao } from "./TituloSecao";

const TEXTO = `Bora pescar! Entra no ${SITE.nome}, o índice de fisgada do grupo. O link já vem com o código:`;

/** Convite pronto: quem recebe abre o link e só precisa criar usuário e senha. */
export function Convite() {
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/convite")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.erro);
        setLink(j.link);
      })
      .catch((e) => setErro(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Sem conexão. O convite aparece quando o sinal voltar."));
  }, []);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não deu para copiar. Toque e segure no link para copiar.");
    }
  }

  async function compartilhar() {
    if (!link) return;
    if (navigator.share) {
      // Cancelar a janela de compartilhar não é erro.
      await navigator.share({ title: SITE.nome, text: TEXTO, url: link }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${TEXTO} ${link}`)}`, "_blank", "noopener");
    }
  }

  return (
    <section aria-labelledby="titulo-convite" className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <TituloSecao id="titulo-convite" titulo="Convidar amigos" Icone={Users} cor="#62d6d3" />
      <p className="text-sm text-pedra">O link já leva o código do grupo. Quem receber só cria o usuário e a senha.</p>
      {erro && !link && <p className="rounded-xl border border-barro/50 bg-terra px-3 py-2 text-sm">{erro}</p>}
      {link && (
        <>
          <p className="truncate rounded-xl border border-osso/15 bg-mata px-3 py-2.5 font-mono text-xs text-pedra" title={link}>
            {link}
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <button onClick={compartilhar} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rio font-semibold text-white hover:bg-rio/85">
              <Share2 size={18} aria-hidden /> Compartilhar
            </button>
            <button onClick={copiar} aria-live="polite" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-osso/25 font-semibold hover:bg-osso/5">
              {copiado ? <Check size={18} className="text-broto" aria-hidden /> : <Copy size={18} aria-hidden />}
              {copiado ? "Copiado!" : "Copiar link"}
            </button>
          </div>
          <p className="text-xs text-pedra">Mande só para quem é do grupo: com o link, qualquer pessoa consegue criar conta.</p>
        </>
      )}
    </section>
  );
}
