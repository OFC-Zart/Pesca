import { getMoonIllumination, getMoonPosition, getTimes } from "suncalc";
import type { Astro } from "./tipos";

const PASSO_MIN = 5;

/**
 * Sol e lua de um dia local. Tudo é calculado a partir do deslocamento de fuso que o Open-Meteo informa,
 * então o resultado não depende do fuso do servidor (a Vercel roda em UTC).
 */
export function calcularAstro(data: string, lat: number, lon: number, offsetSeg: number): Astro {
  const [a, m, d] = data.split("-").map(Number);
  const meiaNoite = Date.UTC(a, m - 1, d) - offsetSeg * 1000;
  const meioDia = new Date(meiaNoite + 12 * 3600 * 1000);

  const horaLocal = (dt: Date | null | undefined): number | null => {
    if (!dt || Number.isNaN(dt.getTime())) return null;
    return (dt.getTime() - meiaNoite) / 3600000;
  };

  const sol = getTimes(meioDia, lat, lon);

  let luaAlta = 0;
  let luaBaixa = 0;
  let maxAlt = -Infinity;
  let minAlt = Infinity;
  let nascerLua: number | null = null;
  let porLua: number | null = null;
  let anterior: number | null = null;
  for (let min = 0; min <= 24 * 60; min += PASSO_MIN) {
    const alt = getMoonPosition(new Date(meiaNoite + min * 60000), lat, lon).altitude;
    const hora = min / 60;
    if (alt > maxAlt) { maxAlt = alt; luaAlta = hora; }
    if (alt < minAlt) { minAlt = alt; luaBaixa = hora; }
    if (anterior !== null) {
      if (anterior < 0 && alt >= 0) nascerLua = hora;
      if (anterior >= 0 && alt < 0) porLua = hora;
    }
    anterior = alt;
  }

  const ilum = getMoonIllumination(meioDia);
  return {
    nascerSol: horaLocal(sol.sunrise),
    porSol: horaLocal(sol.sunset),
    nascerLua,
    porLua,
    luaAlta,
    luaBaixa,
    idadeLua: ilum.phase * 29.53,
    iluminacao: ilum.fraction,
    crescente: ilum.phase < 0.5,
  };
}
