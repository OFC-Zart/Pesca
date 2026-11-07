"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EVENTO_PERFIL, gravarPerfil, lerPerfil, type PerfilLocal } from "@/lib/armazem";
import { SITE } from "@/config/site";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { NavegacaoTopo } from "./Navegacao";

export function Cabecalho() {
  const rota = usePathname();
  const naEntrada = rota === "/entrar";
  const [perfil, setPerfil] = useState<PerfilLocal | null>(null);

  useEffect(() => {
    if (naEntrada) return;
    const atualizar = () => setPerfil(lerPerfil());
    atualizar();
    window.addEventListener(EVENTO_PERFIL, atualizar);
    fetch("/api/perfil")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && gravarPerfil(p))
      .catch(() => {});
    return () => window.removeEventListener(EVENTO_PERFIL, atualizar);
  }, [naEntrada]);

  if (naEntrada) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-osso/10 bg-breu/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label={`${SITE.nome}, início`}>
          <Logo />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <NavegacaoTopo />
          <span className="rotulo hidden min-[440px]:inline md:hidden">{SITE.regiao}</span>
          {perfil && (
            <Link href="/perfil" aria-label={`Seu perfil, ${perfil.nome}`} className="flex items-center gap-2 rounded-full">
              <span className="hidden max-w-28 truncate text-sm font-medium lg:block">{perfil.nome}</span>
              <Avatar icone={perfil.icone} tam={38} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
