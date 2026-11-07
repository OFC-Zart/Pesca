import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { GerenciarLocais } from "@/components/GerenciarLocais";
import { TituloPagina } from "@/components/TituloPagina";

export const metadata: Metadata = { title: "Locais" };

export default function Pagina() {
  return (
    <>
      <TituloPagina Icone={MapPin} cor="#a9cb54" titulo="Locais" sub="Cada ponto tem seu clima e seu tipo de água. As medições de termômetro calibram a água de cada um." />
      <GerenciarLocais />
    </>
  );
}
