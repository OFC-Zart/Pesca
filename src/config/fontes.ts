/**
 * Fontes de dados do índice, além do clima principal do Open-Meteo.
 * Estações e represas escolhidas na Serra Catarinense (AMURES) e arredores, conferidas em 07/11/2026:
 * todas tinham dado das últimas horas nos serviços da ANA, do ONS e no catálogo do INMET.
 */

/** Modelos de previsão buscados lado a lado. Nomes exatos da API do Open-Meteo. */
export const MODELOS = [
  { id: "best_match", nome: "Melhor combinação", origem: "Open-Meteo" },
  { id: "ecmwf_ifs", nome: "ECMWF IFS", origem: "Europa" },
  { id: "gfs_seamless", nome: "GFS", origem: "EUA" },
  { id: "icon_seamless", nome: "ICON", origem: "Alemanha" },
  { id: "gem_seamless", nome: "GEM", origem: "Canadá" },
  { id: "jma_seamless", nome: "JMA", origem: "Japão" },
] as const;

export type ModeloId = (typeof MODELOS)[number]["id"];
export const MODELO_IDS = MODELOS.map((m) => m.id) as ModeloId[];

/** As cinco variáveis comparadas entre modelos e conferidas contra o que aconteceu. */
export const VARIAVEIS = [
  { id: "temp", api: "temperature_2m", nome: "Temperatura", unidade: "°C" },
  { id: "pressao", api: "pressure_msl", nome: "Pressão", unidade: "hPa" },
  { id: "vento", api: "wind_speed_10m", nome: "Vento", unidade: "m/s" },
  { id: "chuva", api: "precipitation", nome: "Chuva", unidade: "mm" },
  { id: "nuvens", api: "cloud_cover", nome: "Nuvens", unidade: "%" },
] as const;

export type VariavelId = (typeof VARIAVEIS)[number]["id"];
export const VARIAVEL_IDS = VARIAVEIS.map((v) => v.id) as VariavelId[];

/** Faixas de horário usadas na conferência e na correção de viés: madrugada, manhã, tarde e noite. */
export const FAIXAS = ["Madrugada", "Manhã", "Tarde", "Noite"] as const;
export const faixaDaHora = (hora: number) => Math.min(3, Math.floor(hora / 6));

/** Antecedências conferidas, em dias. */
export const ANTECEDENCIAS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Estações automáticas do INMET usadas como "o que aconteceu". Altitude em metros. */
export const ESTACOES_INMET = [
  { id: "A865", nome: "Lages", lat: -27.8022, lon: -50.3356, alt: 953 },
  { id: "A815", nome: "São Joaquim", lat: -28.2756, lon: -49.9347, alt: 1400 },
  { id: "A898", nome: "Campos Novos", lat: -27.3886, lon: -51.2158, alt: 963 },
  { id: "A860", nome: "Curitibanos", lat: -27.2886, lon: -50.6042, alt: 978 },
  { id: "A880", nome: "Vacaria (RS)", lat: -28.5136, lon: -50.8828, alt: 970 },
] as const;

/** Onde a precisão de cada modelo é conferida todo dia: o centro, a serra alta e o oeste da região. */
export const PONTOS_VERIFICACAO = ["A865", "A815", "A898"] as const;

/** Estações telemétricas da ANA em rios da região. `nivel`/`chuva` dizem o que cada uma mede. */
export const ESTACOES_ANA = [
  { id: "71200000", nome: "Vila Canoas", rio: "Rio Canoas", municipio: "Bocaina do Sul", lat: -27.8028, lon: -49.7786, nivel: true, chuva: true },
  { id: "71300000", nome: "Rio Bonito", rio: "Rio Canoas", municipio: "Bocaina do Sul", lat: -27.7022, lon: -49.84, nivel: true, chuva: true },
  { id: "71325000", nome: "Campos Novos Montante 2", rio: "Rio Canoas", municipio: "Bocaina do Sul", lat: -27.6556, lon: -49.9522, nivel: true, chuva: true },
  { id: "71350001", nome: "Encruzilhada II", rio: "Rio Canoas", municipio: "Otacílio Costa", lat: -27.5078, lon: -50.1128, nivel: true, chuva: true },
  { id: "71351000", nome: "São Roque Montante 1", rio: "Rio Canoas", municipio: "Palmeira", lat: -27.4842, lon: -50.1478, nivel: true, chuva: true },
  { id: "71383300", nome: "Campos Novos Montante 1", rio: "Rio Canoas", municipio: "Ponte Alta", lat: -27.4858, lon: -50.3917, nivel: true, chuva: true },
  { id: "71540000", nome: "Garibaldi Montante 1", rio: "Rio Canoas", municipio: "São José do Cerrito", lat: -27.5169, lon: -50.8322, nivel: true, chuva: true },
  { id: "71740000", nome: "Garibaldi Jusante", rio: "Rio Canoas", municipio: "Abdon Batista", lat: -27.6372, lon: -51.0047, nivel: true, chuva: false },
  { id: "71647000", nome: "Campos Novos Rio Caveiras", rio: "Rio Caveiras", municipio: "São José do Cerrito", lat: -27.6711, lon: -50.7097, nivel: true, chuva: true },
  { id: "71655000", nome: "Garibaldi Montante 2", rio: "Rio Caveiras", municipio: "São José do Cerrito", lat: -27.6339, lon: -50.7806, nivel: true, chuva: true },
  { id: "70150000", nome: "Passo do Honorato", rio: "Rio Pelotas", municipio: "Bom Jesus (RS)", lat: -28.3944, lon: -50.5756, nivel: true, chuva: true },
  { id: "70120000", nome: "Faxinal Preto", rio: "Rio Pelotas", municipio: "São José dos Ausentes (RS)", lat: -28.4456, lon: -49.8975, nivel: true, chuva: true },
  { id: "70305000", nome: "Fazenda Mineira", rio: "Rio Lava-Tudo", municipio: "São Joaquim", lat: -28.0894, lon: -50.0614, nivel: true, chuva: true },
  { id: "70305110", nome: "Boa Vista Jusante", rio: "Rio Lava-Tudo", municipio: "Lages", lat: -28.2022, lon: -50.1733, nivel: true, chuva: false },
  { id: "70600000", nome: "Vacas Gordas", rio: "Rio Vacas Gordas", municipio: "Campo Belo do Sul", lat: -28.02, lon: -50.7822, nivel: true, chuva: true },
  { id: "70319000", nome: "Ramada Montante", rio: "Rio Antoninha", municipio: "São Joaquim", lat: -28.2681, lon: -50.175, nivel: true, chuva: false },
  { id: "70110000", nome: "Invernadinha Montante", rio: "Rio Invernadinho", municipio: "São Joaquim", lat: -28.4025, lon: -49.9106, nivel: true, chuva: true },
  { id: "70371000", nome: "Willy Faller Montante", rio: "Lajeado dos Portões", municipio: "Anita Garibaldi", lat: -27.7769, lon: -50.9481, nivel: true, chuva: true },
  { id: "70580000", nome: "Arroio Penteado", rio: "Arroio Penteado", municipio: "Lages", lat: -28.2917, lon: -50.4672, nivel: true, chuva: false },
] as const;

export type EstacaoAna = (typeof ESTACOES_ANA)[number];

/**
 * Represas de usina na região. `ons` é o nome no boletim diário do ONS; `ana` é a estação na barragem, usada se o ONS falhar.
 * `pontos` marca a barragem e o meio do lago, para achar a represa mais perto de um local.
 */
export const REPRESAS = [
  { id: "campos-novos", nome: "UHE Campos Novos", rio: "Rio Canoas", ons: "CAMPOS NOVOS", ana: "71840000", pontos: [[-27.6064, -51.3256], [-27.62, -51.15], [-27.63, -51.02]] },
  { id: "barra-grande", nome: "UHE Barra Grande", rio: "Rio Pelotas", ons: "BARRA GRANDE", ana: "70840080", pontos: [[-27.78, -51.1917], [-27.9, -51.0], [-28.02, -50.8], [-28.15, -50.68]] },
  { id: "garibaldi", nome: "UHE Garibaldi", rio: "Rio Canoas", ons: "GARIBALDI", ana: "71700000", pontos: [[-27.6264, -50.9858], [-27.57, -50.9], [-27.634, -50.78]] },
  { id: "sao-roque", nome: "UHE São Roque", rio: "Rio Canoas", ons: "SAO ROQUE", ana: "71539800", pontos: [[-27.495, -50.8078], [-27.47, -50.7]] },
] as const;

export type RepresaId = (typeof REPRESAS)[number]["id"];

/** Distâncias máximas para uma estação valer por um local. */
export const ALCANCE_KM = { inmet: 60, chuva: 30, rio: 40 } as const;

/** Previsão vale por 1 hora; estação, rio e represa, por 3 horas. Cada fonte tem 10 s para responder. */
export const CACHE_SEG = { previsao: 3600, observacao: 3 * 3600 } as const;
export const TEMPO_LIMITE_MS = 10_000;
/** A ANA leva de 2 s a mais de 40 s. Quando a busca roda depois da resposta (ninguém esperando), ela ganha mais tempo. */
export const TEMPO_LIMITE_FUNDO_MS = 55_000;

/** Guardar: respostas brutas 30 dias; previsões dos modelos 60 dias; o que aconteceu 90 dias. */
export const RETENCAO_DIAS = { brutas: 30, previsoesModelos: 60, observacoes: 90, precisao: 30 } as const;

/** Janela da conferência e mínimo de dias para trocar os pesos iguais e ligar a correção de viés. */
export const JANELA_PRECISAO_DIAS = 30;
export const DIAS_INICIAIS = 60;
export const MINIMO_COMPARACOES = 10;

/** Ar cai cerca de 0,65 °C a cada 100 m de subida: corrige a estação para a altitude do local. */
export const GRADIENTE_ALTITUDE = 0.0065;

export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function maisPerto<T extends { lat: number; lon: number }>(lat: number, lon: number, lista: readonly T[], maxKm = Infinity) {
  let melhor: (T & { km: number }) | null = null;
  for (const e of lista) {
    const km = distanciaKm(lat, lon, e.lat, e.lon);
    if (km <= maxKm && (!melhor || km < melhor.km)) melhor = { ...e, km };
  }
  return melhor;
}

export function represaMaisPerto(lat: number, lon: number) {
  let melhor: { id: RepresaId; km: number } | null = null;
  for (const r of REPRESAS) {
    for (const [la, lo] of r.pontos) {
      const km = distanciaKm(lat, lon, la, lo);
      if (!melhor || km < melhor.km) melhor = { id: r.id, km };
    }
  }
  return melhor!;
}
