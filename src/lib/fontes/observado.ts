import { GRADIENTE_ALTITUDE } from "@/config/fontes";
import type { SerieClima } from "@/lib/indice/tipos";
import type { LeituraEstacao } from "./estacoes";

/** O que foi medido perto do local, por hora local. */
export interface Observado {
  temp: Map<string, number>;
  pressao: Map<string, number>;
  vento: Map<string, number>;
  chuva: Map<string, number>;
}

export const observadoVazio = (): Observado => ({ temp: new Map(), pressao: new Map(), vento: new Map(), chuva: new Map() });

/** Estação mais baixa que o local mede ar mais quente: desconta 0,65 °C a cada 100 m de diferença. */
export const corrigirAltitude = (temp: number, altEstacao: number, altLocal: number) => temp + (altEstacao - altLocal) * GRADIENTE_ALTITUDE;

/** Temperatura, pressão e vento da estação, já trazidos para a altitude do local. */
export function doEstacao(leituras: LeituraEstacao[], altEstacao: number, altLocal: number): Omit<Observado, "chuva"> {
  const o = observadoVazio();
  for (const l of leituras) {
    if (l.temp !== null) o.temp.set(l.tempo, corrigirAltitude(l.temp, altEstacao, altLocal));
    if (l.pressao !== null) o.pressao.set(l.tempo, l.pressao);
    if (l.vento !== null) o.vento.set(l.tempo, l.vento);
  }
  return o;
}

/**
 * Chuva de várias estações, ponderada pelo inverso do quadrado da distância: a mais perto manda mais.
 * Cada hora usa só as estações que mediram naquela hora.
 */
export function combinarChuva(fontes: { mapa: Map<string, number>; km: number }[]): Map<string, number> {
  const horas = new Set(fontes.flatMap((f) => [...f.mapa.keys()]));
  const out = new Map<string, number>();
  for (const h of horas) {
    let s = 0;
    let t = 0;
    for (const f of fontes) {
      const x = f.mapa.get(h);
      if (x === undefined) continue;
      const w = 1 / Math.max(f.km, 1) ** 2;
      s += w * x;
      t += w;
    }
    if (t > 0) out.set(h, s / t);
  }
  return out;
}

/** Troca o passado da série (antes de `ate`) pelo que foi medido. Devolve também quantas horas de cada coisa vieram da medição. */
export function aplicarObservado(serie: SerieClima, obs: Observado, ate: string) {
  const nova: SerieClima = { ...serie, temp: [...serie.temp], pressao: [...serie.pressao], vento: [...serie.vento], chuva: [...serie.chuva] };
  const horas = { temp: 0, pressao: 0, vento: 0, chuva: 0 };
  serie.tempo.forEach((t, i) => {
    if (t >= ate) return;
    for (const k of ["temp", "pressao", "vento", "chuva"] as const) {
      const x = obs[k].get(t);
      if (x !== undefined) {
        nova[k][i] = x;
        horas[k]++;
      }
    }
  });
  return { serie: nova, horas };
}
