"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, History, PlusCircle } from "lucide-react";

const ITENS = [
  { href: "/", nome: "Índice", Icone: Compass },
  { href: "/registrar", nome: "Registrar", Icone: PlusCircle },
  { href: "/historico", nome: "Histórico", Icone: History },
  { href: "/como-funciona", nome: "Como funciona", Icone: BookOpen },
];

export function NavegacaoTopo() {
  const rota = usePathname();
  if (rota === "/entrar") return null;
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
      {ITENS.map(({ href, nome }) => (
        <Link
          key={href}
          href={href}
          aria-current={rota === href ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            rota === href ? "bg-folha text-brotinho" : "text-pedra hover:text-osso"
          }`}
        >
          {nome}
        </Link>
      ))}
    </nav>
  );
}

export function NavegacaoBase() {
  const rota = usePathname();
  if (rota === "/entrar") return null;
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-osso/10 bg-mata/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {ITENS.map(({ href, nome, Icone }) => {
        const ativo = rota === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              ativo ? "text-brotinho" : "text-pedra"
            }`}
          >
            <Icone size={22} strokeWidth={ativo ? 2.4 : 1.8} aria-hidden />
            {nome === "Como funciona" ? "Como é" : nome}
          </Link>
        );
      })}
    </nav>
  );
}
