"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { enviarPendentes } from "@/lib/armazem";

/** Instala o service worker e reenvia as pescarias que ficaram presas sem sinal. */
export function RegistrarSW() {
  const rota = usePathname();
  useEffect(() => {
    // Antes de entrar não há nada para guardar: as páginas ainda respondem com a tela de código.
    if (rota === "/entrar") return;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    void enviarPendentes();
    const aoVoltar = () => void enviarPendentes();
    window.addEventListener("online", aoVoltar);
    return () => window.removeEventListener("online", aoVoltar);
  }, [rota]);
  return null;
}
