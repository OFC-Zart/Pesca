"use client";

import { useEffect, useRef, useState } from "react";

/** O número corre até a nota certa. Leitores de tela recebem só o valor final. */
export function Contador({ valor, duracao = 650 }: { valor: number; duracao?: number }) {
  const [mostrado, setMostrado] = useState(() => Math.max(0, valor - 25));
  const anterior = useRef(Math.max(0, valor - 25));

  useEffect(() => {
    const de = anterior.current;
    anterior.current = valor;
    if (de === valor || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMostrado(valor);
      return;
    }
    const inicio = performance.now();
    let quadro = 0;
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao);
      setMostrado(Math.round(de + (valor - de) * (1 - (1 - p) ** 3)));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    // Em aba escondida o navegador pausa os quadros: a nota certa aparece mesmo assim.
    const garantia = setTimeout(() => setMostrado(valor), duracao + 150);
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(garantia);
    };
  }, [valor, duracao]);

  return (
    <>
      <span aria-hidden>{mostrado}</span>
      <span className="sr-only">{valor}</span>
    </>
  );
}
