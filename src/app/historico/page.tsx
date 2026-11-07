import { History } from "lucide-react";
import type { Metadata } from "next";
import { Historico } from "@/components/Historico";
import { TituloPagina } from "@/components/TituloPagina";

export const metadata: Metadata = { title: "Histórico" };

export default function Pagina() {
  return (
    <>
      <TituloPagina Icone={History} cor="#62d6d3" titulo="Histórico" sub="O que os pescadores registraram, em peixes por hora: a medida que corrige o tempo de pesca." />
      <Historico />
    </>
  );
}
