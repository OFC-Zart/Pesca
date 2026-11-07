import { Cloud, CloudRain, CloudSun, Sun } from "lucide-react";
import { NOME_TEMPO, tempoDoDia } from "@/lib/cena";
import type { Brutos } from "@/lib/indice/tipos";

const ICONE = {
  limpo: { Icone: Sun, cor: "#ffd166" },
  "poucas-nuvens": { Icone: CloudSun, cor: "#ffcf80" },
  nublado: { Icone: Cloud, cor: "#cfd6de" },
  chuva: { Icone: CloudRain, cor: "#7fb0ff" },
};

export function IconeTempo({ brutos, tam = 18 }: { brutos: Pick<Brutos, "nuvens" | "chuva48h">; tam?: number }) {
  const t = tempoDoDia(brutos);
  const { Icone, cor } = ICONE[t];
  return <Icone size={tam} color={cor} role="img" aria-label={NOME_TEMPO[t]} className="shrink-0" />;
}
