import type { InfoFontes } from "./tipos";

/** Previsão sem fontes extras (ou guardada antes delas existirem). Fica fora de previsao.ts para poder ir ao navegador. */
export const FONTES_VAZIAS: InfoFontes = { modelos: 0, pesos: "iguais", correcaoVies: false, origens: {}, rio: null, represa: null, avisos: [], hoje: [] };
