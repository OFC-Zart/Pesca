import { CACHE_SEG } from "@/config/fontes";
import { buscarTexto, obterFonte, type Obtido } from "./guardar";

/** Leitura horária de estação meteorológica, já em hora local e com a pressão levada ao nível do mar. */
export interface LeituraEstacao {
  tempo: string;
  temp: number | null;
  pressao: number | null;
  vento: number | null;
  chuva: number | null;
}

export interface Estacao {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  alt: number;
}

/** Toda fonte de estação segue este formato, para trocar uma pela outra sem mexer no resto. */
export interface FonteEstacao {
  id: "inmet" | "epagri";
  nome: string;
  configurada(): boolean;
  obter(estacao: Estacao, dias: number): Promise<Obtido<LeituraEstacao[]>>;
}

const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Pressão da estação levada ao nível do mar (fórmula hipsométrica), para comparar com a dos modelos. */
export function pressaoNoMar(p: number, altitude: number, temp: number) {
  return p * (1 - (0.0065 * altitude) / (temp + 0.0065 * altitude + 273.15)) ** -5.257;
}

/** Hora UTC "YYYY-MM-DD" + "HHMM" para hora local de Brasília (UTC−3, sem horário de verão desde 2019). */
function utcParaLocal(data: string, hhmm: string) {
  const h = hhmm.padStart(4, "0");
  const t = Date.parse(`${data}T${h.slice(0, 2)}:${h.slice(2, 4)}:00Z`) - 3 * 3_600_000;
  return new Date(t).toISOString().slice(0, 16);
}

/**
 * Lê a resposta horária do INMET (lista de objetos com DT_MEDICAO, HR_MEDICAO em UTC, TEM_INS, PRE_INS, VEN_VEL, CHUVA).
 * A CHUVA de uma hora é o que caiu na hora anterior, como no Open-Meteo.
 */
export function lerJsonInmet(texto: string, altitude: number): LeituraEstacao[] {
  const lista = JSON.parse(texto);
  if (!Array.isArray(lista) || !lista.length) throw new Error("INMET sem leituras no período");
  const out: LeituraEstacao[] = [];
  for (const o of lista) {
    if (!o?.DT_MEDICAO || o.HR_MEDICAO === undefined) continue;
    const temp = num(o.TEM_INS);
    const p = num(o.PRE_INS);
    out.push({
      tempo: utcParaLocal(String(o.DT_MEDICAO), String(o.HR_MEDICAO)),
      temp,
      pressao: p !== null && temp !== null ? pressaoNoMar(p, altitude, temp) : null,
      vento: num(o.VEN_VEL),
      chuva: num(o.CHUVA),
    });
  }
  return out.sort((a, b) => a.tempo.localeCompare(b.tempo));
}

const dataUtc = (d: Date) => d.toISOString().slice(0, 10);

export const tokenInmet = () => process.env.INMET_TOKEN?.trim() || null;

export const INMET: FonteEstacao = {
  id: "inmet",
  nome: "INMET",
  configurada: () => Boolean(tokenInmet()),
  obter(estacao, dias) {
    return obterFonte({
      fonte: `inmet:${estacao.id}:${dias}`,
      nome: `INMET · ${estacao.nome}`,
      grupo: "INMET",
      validadeSeg: CACHE_SEG.observacao,
      // O token vai no caminho do endereço, como pede o INMET. Ele nunca é gravado: só o corpo da resposta é guardado.
      buscar: (tempoMs, usarCache) => {
        const fim = new Date();
        const ini = new Date(fim.getTime() - dias * 86_400_000);
        return buscarTexto(`https://apitempo.inmet.gov.br/token/estacao/${dataUtc(ini)}/${dataUtc(fim)}/${estacao.id}/${tokenInmet()}`, { tempoMs, revalidar: usarCache ? CACHE_SEG.observacao : undefined });
      },
      ler: (t) => lerJsonInmet(t, estacao.alt),
    });
  },
};

/**
 * Conector da Epagri/Ciram, pronto para ligar quando houver acesso.
 * Configure EPAGRI_CIRAM_URL com {estacao}, {inicio} e {fim} (datas AAAA-MM-DD) no lugar dos valores,
 * e EPAGRI_CIRAM_TOKEN se o acesso pedir chave (vai no cabeçalho Authorization: Bearer).
 * Formato esperado da resposta: lista de { dataHora: "AAAA-MM-DDTHH:mm" (hora local), temperatura, pressao (hPa, nível da estação), vento (m/s), chuva (mm) }.
 * Se a Epagri entregar outro formato, só a função `lerJsonEpagri` precisa mudar.
 */
export function lerJsonEpagri(texto: string, altitude: number): LeituraEstacao[] {
  const lista = JSON.parse(texto);
  if (!Array.isArray(lista) || !lista.length) throw new Error("Epagri sem leituras no período");
  return lista
    .map((o) => {
      const temp = num(o.temperatura);
      const p = num(o.pressao);
      return {
        tempo: String(o.dataHora).slice(0, 16),
        temp,
        pressao: p !== null && temp !== null ? pressaoNoMar(p, altitude, temp) : null,
        vento: num(o.vento),
        chuva: num(o.chuva),
      };
    })
    .sort((a, b) => a.tempo.localeCompare(b.tempo));
}

export const EPAGRI: FonteEstacao = {
  id: "epagri",
  nome: "Epagri/Ciram",
  configurada: () => Boolean(process.env.EPAGRI_CIRAM_URL?.trim()),
  obter(estacao, dias) {
    return obterFonte({
      fonte: `epagri:${estacao.id}:${dias}`,
      nome: `Epagri/Ciram · ${estacao.nome}`,
      grupo: "Epagri/Ciram",
      validadeSeg: CACHE_SEG.observacao,
      buscar: (tempoMs, usarCache) => {
        const fim = new Date();
        const ini = new Date(fim.getTime() - dias * 86_400_000);
        const url = process.env.EPAGRI_CIRAM_URL!.replace("{estacao}", estacao.id).replace("{inicio}", dataUtc(ini)).replace("{fim}", dataUtc(fim));
        const token = process.env.EPAGRI_CIRAM_TOKEN?.trim();
        return buscarTexto(url, { tempoMs, revalidar: usarCache ? CACHE_SEG.observacao : undefined, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      },
      ler: (t) => lerJsonEpagri(t, estacao.alt),
    });
  },
};

/** As fontes de estação na ordem de preferência. Só as configuradas entram. */
export const FONTES_ESTACAO: FonteEstacao[] = [INMET, EPAGRI];
