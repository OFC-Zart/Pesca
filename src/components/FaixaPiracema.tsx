"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { PIRACEMA } from "@/config/indice";
import { piracemaAtiva } from "@/lib/formato";

export function FaixaPiracema() {
  const rota = usePathname();
  const [ativa, setAtiva] = useState(false);
  // A data precisa ser a do aparelho hoje, não a do dia em que o site foi publicado.
  useEffect(() => setAtiva(piracemaAtiva()), []);
  if (!ativa || rota === "/entrar") return null;

  return (
    <details className="border-b border-boia/50 bg-sangue text-osso">
      <summary className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <TriangleAlert size={18} className="shrink-0 text-boia-clara" aria-hidden />
        <span className="min-w-0 flex-1 text-sm leading-snug">
          <strong className="font-semibold">Piracema até 31/01.</strong> Só uma vara ou linha de mão, até 5 kg + 1 exemplar.
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-boia-clara">
          Regras
          <ChevronDown size={16} className="seta transition-transform" aria-hidden />
        </span>
      </summary>
      <div className="mx-auto max-w-6xl px-4 pb-4 text-sm">
        <p className="mb-2 text-osso/80">De 1º de outubro a 31 de janeiro, na {PIRACEMA.bacia}, que inclui o Rio Canoas e os afluentes de Cerro Negro:</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {PIRACEMA.regras.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-boia-clara" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-osso/80">{PIRACEMA.pesquePague}</p>
        <p className="mt-1 font-semibold">{PIRACEMA.aviso}</p>
      </div>
    </details>
  );
}
