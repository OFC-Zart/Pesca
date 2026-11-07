import Image from "next/image";

/** A fotinha de peixe num círculo claro, com cara de figurinha. */
export function Avatar({ icone, tam = 36, carregarJa = false }: { icone: string; tam?: number; carregarJa?: boolean }) {
  const dentro = Math.round(tam * 0.8);
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-full bg-osso" style={{ width: tam, height: tam }} aria-hidden>
      <Image src={`/peixes/${icone}.webp`} alt="" width={dentro} height={dentro} unoptimized loading={carregarJa ? "eager" : "lazy"} />
    </span>
  );
}
