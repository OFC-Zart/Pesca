import type { Metadata } from "next";
import { FormRegistro } from "@/components/FormRegistro";
import { TituloPagina } from "@/components/TituloPagina";

export const metadata: Metadata = { title: "Registrar pescaria" };

export default function Pagina() {
  return (
    <>
      <TituloPagina titulo="Registrar pescaria" sub="O clima do dia entra sozinho. Seu ponto secreto continua secreto: só os locais da lista aparecem." />
      <FormRegistro />
    </>
  );
}
