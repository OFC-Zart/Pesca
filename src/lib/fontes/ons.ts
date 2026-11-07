import { REPRESAS } from "@/config/fontes";
import { buscarTexto, type Resposta } from "./guardar";

export interface NivelDiario {
  represa: string;
  data: string;
  nivel: number;
  volume: number | null;
}

export const urlOns = (ano: number) =>
  `https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/dados_hidrologicos_di/DADOS_HIDROLOGICOS_RES_${ano}.csv`;

/**
 * Separa do arquivo anual do ONS (≈ 9 MB) só as linhas das represas da região, mantendo o cabeçalho: é isso que se guarda.
 * Com `desde` (AAAA-MM-DD), fica só dessa data em diante.
 */
export function recortarCsvOns(csv: string, desde?: string): string {
  const linhas = csv.split(/\r?\n/);
  const iData = linhas[0].split(";").map((c) => c.trim()).indexOf("din_instante");
  const nomes = REPRESAS.map((r) => `;${r.ons};`);
  const servem = (l: string) => nomes.some((n) => l.includes(n)) && (!desde || iData < 0 || (l.split(";")[iData] ?? "").slice(0, 10) >= desde);
  return [linhas[0], ...linhas.slice(1).filter(servem)].join("\n");
}

/** Lê o CSV do ONS (separado por ";"): nível a montante em metros e % do volume útil, por dia. */
export function lerCsvOns(csv: string): NivelDiario[] {
  const linhas = csv.split(/\r?\n/).filter(Boolean);
  if (linhas.length < 2) return [];
  const cab = linhas[0].split(";").map((c) => c.trim());
  const col = (n: string) => cab.indexOf(n);
  const iNome = col("nom_reservatorio");
  const iData = col("din_instante");
  const iNivel = col("val_nivelmontante");
  const iVol = col("val_volumeutilcon");
  if ([iNome, iData, iNivel].some((i) => i < 0)) throw new Error("CSV do ONS mudou de formato");
  const porOns = new Map<string, string>(REPRESAS.map((r) => [r.ons, r.id]));
  const out: NivelDiario[] = [];
  for (const l of linhas.slice(1)) {
    const c = l.split(";");
    const id = porOns.get(c[iNome]?.trim());
    if (!id) continue;
    const nivel = Number(c[iNivel]);
    if (!c[iNivel] || !Number.isFinite(nivel)) continue;
    const vol = iVol >= 0 && c[iVol] ? Number(c[iVol]) : NaN;
    out.push({ represa: id, data: c[iData].trim().slice(0, 10), nivel, volume: Number.isFinite(vol) ? vol : null });
  }
  return out;
}

/** Baixa o ano corrente (e o anterior no começo de janeiro, para fechar 7 dias). Só a rotina diária chama: o arquivo é grande. */
export async function baixarOns(hoje: string): Promise<{ niveis: NivelDiario[]; respostas: Resposta[] }> {
  const ano = Number(hoje.slice(0, 4));
  const anos = hoje.slice(5) <= "01-10" ? [ano - 1, ano] : [ano];
  const respostas: Resposta[] = [];
  const niveis: NivelDiario[] = [];
  for (const a of anos) {
    const r = await buscarTexto(urlOns(a), { tempoMs: 60_000 });
    if (!r.ok) throw new Error(`ONS respondeu ${r.status}`);
    const recorte = recortarCsvOns(r.texto, new Date(Date.parse(hoje) - 40 * 86_400_000).toISOString().slice(0, 10));
    respostas.push({ ...r, texto: recorte });
    niveis.push(...lerCsvOns(recorte));
  }
  return { niveis, respostas };
}

/** Variação do nível entre o último dia e o dia mais perto de 7 dias antes. */
export function variacao7Dias(niveis: { data: string; nivel: number; volume?: number | null }[]) {
  const ord = [...niveis].sort((a, b) => a.data.localeCompare(b.data));
  if (ord.length < 2) return null;
  const ultimo = ord[ord.length - 1];
  const alvo = Date.parse(ultimo.data) - 7 * 86_400_000;
  let antes = ord[0];
  for (const n of ord) if (Math.abs(Date.parse(n.data) - alvo) < Math.abs(Date.parse(antes.data) - alvo)) antes = n;
  if (Math.abs(Date.parse(antes.data) - alvo) > 2 * 86_400_000) return null;
  return { atual: ultimo.nivel, variacao: ultimo.nivel - antes.nivel, data: ultimo.data, volume: ultimo.volume ?? null };
}
