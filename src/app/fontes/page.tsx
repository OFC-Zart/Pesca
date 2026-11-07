import { RadioTower } from "lucide-react";
import type { Metadata } from "next";
import { PainelFontes } from "@/components/PainelFontes";
import { TituloPagina } from "@/components/TituloPagina";

export const metadata: Metadata = { title: "Fontes" };

export default function Pagina() {
  return (
    <>
      <TituloPagina
        Icone={RadioTower}
        cor="#62d6d3"
        titulo="Fontes"
        sub="De onde vêm os números: seis modelos de previsão, estações do INMET, rios e represas da ANA e do ONS. Se uma falha, o índice segue com as outras."
      />
      <PainelFontes />
    </>
  );
}
