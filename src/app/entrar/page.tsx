import type { Metadata } from "next";
import Image from "next/image";
import { FormEntrar } from "@/components/FormEntrar";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Entrar" };

export default function Pagina() {
  return (
    <div className="mx-auto grid max-w-sm gap-5 pt-4 sm:pt-10">
      <Image src="/logo-completo.png" alt={SITE.nome} width={555} height={494} priority unoptimized className="mx-auto h-auto w-56" />
      <div className="text-center">
        <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tight">Só pra turma</h1>
        <p className="mt-2 text-osso/80">Digite o código que a turma passou. Depois disso, este aparelho entra direto.</p>
      </div>
      <FormEntrar />
    </div>
  );
}
