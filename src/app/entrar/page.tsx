import type { Metadata } from "next";
import Image from "next/image";
import { FormEntrar } from "@/components/FormEntrar";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Entrar" };

export default function Pagina() {
  return (
    <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)] gap-5 sm:pt-6">
      <Image src="/logo-completo.png" alt={SITE.nome} width={555} height={494} priority unoptimized className="mx-auto h-auto w-52" />
      <div className="text-center">
        <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tight">Só pra turma</h1>
        <p className="mt-2 text-osso/80">Entre uma vez e este aparelho continua logado.</p>
      </div>
      <FormEntrar />
    </div>
  );
}
