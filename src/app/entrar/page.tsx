import type { Metadata } from "next";
import Image from "next/image";
import { FormEntrar } from "@/components/FormEntrar";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Entrar" };

export default function Pagina() {
  return (
    <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)] gap-5 pt-[env(safe-area-inset-top)] sm:pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Image src="/logo-completo.png" alt={SITE.nome} width={555} height={494} priority unoptimized className="mx-auto h-auto w-52" />
      <div className="text-center">
        <h1 className="sr-only">Entrar no {SITE.nome}</h1>
        <p className="text-osso/80">Entre uma vez e este aparelho continua logado.</p>
      </div>
      <FormEntrar />
    </div>
  );
}
