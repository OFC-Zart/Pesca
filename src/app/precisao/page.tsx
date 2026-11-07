import { Target } from "lucide-react";
import type { Metadata } from "next";
import { PainelPrecisao } from "@/components/PainelPrecisao";
import { TituloPagina } from "@/components/TituloPagina";

export const metadata: Metadata = { title: "Precisão" };

export default function Pagina() {
  return (
    <>
      <TituloPagina
        Icone={Target}
        cor="#f2a93b"
        titulo="Precisão"
        sub="Quanto cada modelo errou na Serra nos últimos 30 dias, de 1 a 7 dias antes. Quem erra menos ganha mais peso na média do índice."
      />
      <PainelPrecisao />
    </>
  );
}
