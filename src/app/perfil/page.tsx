import type { Metadata } from "next";
import { Perfil } from "@/components/Perfil";

export const metadata: Metadata = { title: "Seu perfil" };

export default function Pagina() {
  return <Perfil />;
}
