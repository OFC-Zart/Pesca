import { ESPECIES, type EspecieId } from "@/config/indice";

export function SeloOrigem({ id }: { id: EspecieId }) {
  const nativa = ESPECIES[id].origem === "Nativa";
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
        nativa ? "border-broto/60 text-broto" : "border-barro/60 text-barro"
      }`}
    >
      {ESPECIES[id].origem}
    </span>
  );
}
