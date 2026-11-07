import { PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import { FormRegistro } from "@/components/FormRegistro";
import { TituloPagina } from "@/components/TituloPagina";

export const metadata: Metadata = { title: "Registrar pescaria" };

export default function Pagina() {
  return (
    <>
      <TituloPagina Icone={PlusCircle} cor="#ff7d66" titulo="Registrar pescaria" sub="O clima do dia entra sozinho. Seu ponto secreto continua secreto: só os locais da lista aparecem." />
      <FormRegistro />
    </>
  );
}
