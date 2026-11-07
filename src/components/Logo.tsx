import Image from "next/image";
import { SITE } from "@/config/site";

/** Para trocar o logo: substitua assets/logo-original.png e rode node scripts/gerar-arte.mjs */
export function Logo() {
  return (
    <span className="flex items-center gap-1.5">
      <Image src="/logo-simbolo.png" alt="" width={515} height={336} priority unoptimized className="h-11 w-auto" />
      <Image src="/logo-nome.png" alt={SITE.nome} width={555} height={104} priority unoptimized className="h-[22px] w-auto" />
    </span>
  );
}
