import { SITE } from "@/config/site";
import { Onda, Serra } from "./Paisagem";

/** Pé da página: a serra e o rio, fechando cada tela como um cenário. */
export function MargemRio() {
  return (
    <footer className="margem">
      <Serra className="margem-serra" />
      <div className="margem-agua pb-24 pt-4 text-center md:pb-5">
        <Onda cor="#2a8d91" />
        <p className="relative text-xs text-osso/85">
          {SITE.nome} · {SITE.regiao} · Nem o clima certo garante peixe.
        </p>
      </div>
    </footer>
  );
}
