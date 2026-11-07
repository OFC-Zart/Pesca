import { CACHE_SEG } from "@/config/fontes";
import { buscarTexto, obterFonte } from "./guardar";

/** Uma leitura de estação telemétrica da ANA. Hora local de Brasília; nível em cm; chuva em mm no intervalo. */
export interface LeituraAna {
  tempo: string;
  nivel: number | null;
  chuva: number | null;
}

const num = (s: string | undefined) => {
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Lê o XML do serviço DadosHidrometeorologicos. Devolve em ordem de tempo, sem repetidos. */
export function lerXmlAna(xml: string): LeituraAna[] {
  const blocos = xml.match(/<DadosHidrometereologicos\b[^>]*>[\s\S]*?<\/DadosHidrometereologicos>/g) ?? [];
  const porTempo = new Map<string, LeituraAna>();
  for (const b of blocos) {
    const campo = (nome: string) => b.match(new RegExp(`<${nome}>([^<]*)</${nome}>`))?.[1];
    const dh = campo("DataHora")?.trim();
    if (!dh || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(dh)) continue;
    const tempo = `${dh.slice(0, 10)}T${dh.slice(11, 16)}`;
    porTempo.set(tempo, { tempo, nivel: num(campo("Nivel")), chuva: num(campo("Chuva")) });
  }
  return [...porTempo.values()].sort((a, b) => a.tempo.localeCompare(b.tempo));
}

/** Só aceita a resposta se ela trouxer leituras: estação sem dado no período vem como tabela de erro. */
export function lerXmlAnaComDados(xml: string): LeituraAna[] {
  const l = lerXmlAna(xml);
  if (!l.length) throw new Error("Estação sem leituras no período");
  return l;
}

const paraMinutos = (t: string) => Date.parse(`${t}:00Z`) / 60000;

/** Variação do nível entre a última leitura e a mais perto de `horas` antes dela (tolerância de 3 h). */
export function variacaoNivel(leituras: LeituraAna[], horas: number) {
  const com = leituras.filter((l) => l.nivel !== null);
  if (com.length < 2) return null;
  const ultima = com[com.length - 1];
  const alvo = paraMinutos(ultima.tempo) - horas * 60;
  let antes = com[0];
  for (const l of com) if (Math.abs(paraMinutos(l.tempo) - alvo) < Math.abs(paraMinutos(antes.tempo) - alvo)) antes = l;
  if (Math.abs(paraMinutos(antes.tempo) - alvo) > 180) return null;
  return { atual: ultima.nivel!, variacao: ultima.nivel! - antes.nivel!, medidoEm: ultima.tempo };
}

/**
 * Chuva somada por hora, no mesmo jeito do Open-Meteo: a hora "12:00" guarda o que caiu entre 11:00 e 12:00.
 * Leituras de 15 em 15 minutos caem na hora cheia seguinte.
 */
export function chuvaPorHora(leituras: LeituraAna[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const l of leituras) {
    if (l.chuva === null || l.chuva < 0) continue;
    const m = paraMinutos(l.tempo);
    const cheia = Math.ceil(m / 60) * 60;
    const chave = new Date(cheia * 60000).toISOString().slice(0, 16);
    mapa.set(chave, (mapa.get(chave) ?? 0) + l.chuva);
  }
  return mapa;
}

const dataBr = (d: Date) => {
  const [a, m, dia] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d).split("-");
  return `${dia}/${m}/${a}`;
};

export function urlAna(codigo: string, dias: number, agora = new Date()) {
  const inicio = new Date(agora.getTime() - (dias - 1) * 86_400_000);
  return `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${codigo}&dataInicio=${dataBr(inicio)}&dataFim=${dataBr(agora)}`;
}

/** Leituras recentes de uma estação, guardadas por 3 horas. `dias` = 3 para rio e chuva, 8 para represa. */
export function obterAna(codigo: string, nome: string, dias: number) {
  return obterFonte({
    fonte: `ana:${codigo}:${dias}`,
    nome: `ANA · ${nome}`,
    grupo: "ANA",
    validadeSeg: CACHE_SEG.observacao,
    buscar: (tempoMs, usarCache) => buscarTexto(urlAna(codigo, dias), { tempoMs, revalidar: usarCache ? CACHE_SEG.observacao : undefined }),
    ler: lerXmlAnaComDados,
  });
}
