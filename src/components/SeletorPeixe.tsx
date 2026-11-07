"use client";

import { PEIXES, nomeDoPeixe, type PeixeId } from "@/config/peixes";
import { Avatar } from "./Avatar";

export function SeletorPeixe({ valor, onMudar }: { valor: PeixeId; onMudar: (id: PeixeId) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">
        Sua fotinha: <strong className="text-brotinho">{nomeDoPeixe(valor)}</strong>
      </legend>
      <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {PEIXES.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-transparent p-1.5 text-center hover:bg-osso/5 has-checked:border-brotinho has-checked:bg-folha has-focus-visible:outline-2 has-focus-visible:outline-brotinho"
          >
            <input type="radio" name="icone" value={p.id} checked={valor === p.id} onChange={() => onMudar(p.id)} className="sr-only" />
            <Avatar icone={p.id} tam={56} carregarJa />
            <span className="text-xs leading-tight text-osso/90">{p.nome}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
