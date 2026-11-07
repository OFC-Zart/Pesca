"use client";

import type { EntradaSaida } from "@/lib/esquemas";
import type { Previsao } from "@/lib/indice/tipos";

/** O armazenamento do navegador pode falhar (aba privada, memória cheia): nada aqui deve derrubar a tela. */
function ler<T>(chave: string): T | null {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* segue sem guardar */
  }
}

export const prefs = {
  especie: () => ler<string>("idfish:especie"),
  setEspecie: (v: string) => gravar("idfish:especie", v),
  local: () => ler<string>("idfish:local"),
  setLocal: (v: string) => gravar("idfish:local", v),
};

export const lerPrevisao = (local: string) => ler<Previsao>(`idfish:previsao:${local}`);
export const gravarPrevisao = (local: string, p: Previsao) => gravar(`idfish:previsao:${local}`, p);

const CHAVE_DIARIO = "idfish:diario";

export interface SaidaLocal extends EntradaSaida {
  /** true quando já foi aceita pelo servidor. */
  enviada: boolean;
}

export const lerDiario = () => ler<SaidaLocal[]>(CHAVE_DIARIO) ?? [];

function salvarNoDiario(s: SaidaLocal) {
  const lista = lerDiario().filter((x) => x.clienteId !== s.clienteId);
  gravar(CHAVE_DIARIO, [s, ...lista]);
}

async function enviar(s: EntradaSaida): Promise<"ok" | "sem-banco" | "falha"> {
  try {
    // Sinal fraco pode deixar o pedido pendurado: a pescaria já está salva, então não vale esperar muito.
    const r = await fetch("/api/saidas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) return "ok";
    if (r.status === 503) return "sem-banco";
    return "falha";
  } catch {
    return "falha";
  }
}

/** Sempre guarda no aparelho primeiro: na beira do rio o sinal costuma sumir. */
export async function registrarSaida(s: EntradaSaida) {
  salvarNoDiario({ ...s, enviada: false });
  const r = await enviar(s);
  if (r === "ok") salvarNoDiario({ ...s, enviada: true });
  return r;
}

export async function enviarPendentes() {
  for (const s of lerDiario().filter((x) => !x.enviada)) {
    const { enviada: _ignorado, ...dados } = s;
    if ((await enviar(dados)) === "ok") salvarNoDiario({ ...s, enviada: true });
    else break;
  }
}

const CHAVE_PERFIL = "idfish:perfil";
export const EVENTO_PERFIL = "idfish:perfil-mudou";

export interface PerfilLocal {
  usuario: string;
  nome: string;
  icone: string;
}

export const lerPerfil = () => ler<PerfilLocal>(CHAVE_PERFIL);

export function gravarPerfil(p: PerfilLocal) {
  gravar(CHAVE_PERFIL, p);
  window.dispatchEvent(new Event(EVENTO_PERFIL));
}

export function esquecerPerfil() {
  try {
    localStorage.removeItem(CHAVE_PERFIL);
  } catch {
    /* segue sem apagar */
  }
}
