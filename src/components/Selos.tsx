import { ESPECIES, type EspecieId } from "@/config/indice";

export function SeloOrigem({ id }: { id: EspecieId }) {
  const nativa = ESPECIES[id].origem === "Nativa";
  return (
    <span className={`rounded-md border px-1.5 py-px text-[12px] font-semibold ${nativa ? "border-broto/60 text-broto" : "border-barro/60 text-barro"}`}>
      {ESPECIES[id].origem}
    </span>
  );
}
