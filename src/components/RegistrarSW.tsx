"use client";

import { useEffect } from "react";
import { enviarPendentes } from "@/lib/armazem";

/** Instala o service worker e reenvia as pescarias que ficaram presas sem sinal. */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    void enviarPendentes();
    const aoVoltar = () => void enviarPendentes();
    window.addEventListener("online", aoVoltar);
    return () => window.removeEventListener("online", aoVoltar);
  }, []);
  return null;
}
