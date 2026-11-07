"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Fish, History, MapPin, Plus } from "lucide-react";

const ITENS = [
  { href: "/", nome: "Índice", curto: "Índice", Icone: Fish },
  { href: "/historico", nome: "Histórico", curto: "Histórico", Icone: History },
  { href: "/registrar", nome: "Registrar", curto: "Registrar", Icone: Plus },
  { href: "/locais", nome: "Locais", curto: "Locais", Icone: MapPin },
  { href: "/como-funciona", nome: "Como funciona", curto: "Entenda", Icone: BookOpen },
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
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
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
      className="base-segura fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-osso/15 bg-mata/95 backdrop-blur md:hidden"
    >
      {ITENS.map(({ href, curto, Icone }) => {
        const ativo = rota === href;
        const centro = href === "/registrar";
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-[62px] flex-col items-center justify-center gap-0.5 text-[12px] font-semibold ${ativo ? "text-brotinho" : centro ? "text-osso" : "text-pedra"}`}
          >
            {centro ? (
              <span className="fab-boia">
                <Icone size={28} strokeWidth={2.8} aria-hidden />
              </span>
            ) : (
              <Icone size={23} strokeWidth={ativo ? 2.5 : 2} aria-hidden />
            )}
            {curto}
          </Link>
        );
      })}
    </nav>
  );
}
