import type { SerieClima } from "@/lib/indice/tipos";

const UMA_HORA = 3600;
const VARS = "temperature_2m,pressure_msl,wind_speed_10m,precipitation,cloud_cover,shortwave_radiation";

export interface ClimaBase {
  serie: SerieClima;
  offsetSeg: number;
  /** Altitude do ponto usada pelo Open-Meteo, em metros: serve para corrigir a temperatura da estação. */
  elevacao: number;
}

function comum(lat: number, lon: number) {
  return `latitude=${lat}&longitude=${lon}&wind_speed_unit=ms&timezone=America%2FSao_Paulo`;
}

export async function buscarClima(lat: number, lon: number): Promise<ClimaBase> {
  const url = `https://api.open-meteo.com/v1/forecast?${comum(lat, lon)}&hourly=${VARS},weather_code&past_days=92&forecast_days=16`;
  const r = await fetch(url, { next: { revalidate: UMA_HORA }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Open-Meteo respondeu ${r.status}`);
  const j = await r.json();
  const h = j.hourly;
  return {
    offsetSeg: j.utc_offset_seconds,
    elevacao: j.elevation,
    serie: {
      tempo: h.time,
      temp: h.temperature_2m,
      pressao: h.pressure_msl,
      vento: h.wind_speed_10m,
      chuva: h.precipitation,
      nuvens: h.cloud_cover,
      codigo: h.weather_code,
      sol: h.shortwave_radiation,
    },
  };
}

export type EnsembleBruto = Record<string, (number | null)[]> & { time: string[] };

/** Os 31 cenários do ensemble GFS, como vêm da API. */
export async function buscarEnsembleBruto(lat: number, lon: number): Promise<EnsembleBruto> {
  const url = `https://ensemble-api.open-meteo.com/v1/ensemble?${comum(lat, lon)}&hourly=${VARS}&models=gfs025&past_days=1&forecast_days=8`;
  const r = await fetch(url, { next: { revalidate: UMA_HORA }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Ensemble respondeu ${r.status}`);
  return (await r.json()).hourly;
}

export async function buscarEnsemble(lat: number, lon: number, base: SerieClima): Promise<SerieClima[]> {
  return montarCenarios(await buscarEnsembleBruto(lat, lon), base);
}

/**
 * Uma série por cenário do ensemble.
 * Os meses anteriores, que aquecem o modelo da água, vêm da série principal: o passado é o mesmo em todos os cenários.
 */
export function montarCenarios(h: EnsembleBruto, base: SerieClima): SerieClima[] {

  const indice = new Map(h.time.map((t, i) => [t, i]));
  const sufixos = Object.keys(h)
    .filter((k) => k.startsWith("temperature_2m"))
    .map((k) => k.replace("temperature_2m", ""));
  const ultimo = h.time[h.time.length - 1];
  const fimBase = base.tempo.findIndex((t) => t > ultimo);
  const tempo = fimBase === -1 ? base.tempo : base.tempo.slice(0, fimBase);

  const campo = (nome: string, sufixo: string, reserva: (number | null)[]) =>
    tempo.map((t, i) => {
      const j = indice.get(t);
      return (j === undefined ? null : h[nome + sufixo]?.[j]) ?? reserva[i];
    });

  return sufixos.map((s) => ({
    tempo,
    temp: campo("temperature_2m", s, base.temp),
    pressao: campo("pressure_msl", s, base.pressao),
    vento: campo("wind_speed_10m", s, base.vento),
    chuva: campo("precipitation", s, base.chuva),
    nuvens: campo("cloud_cover", s, base.nuvens),
    codigo: tempo.map((_, i) => base.codigo[i]),
    sol: campo("shortwave_radiation", s, base.sol),
  }));
}
