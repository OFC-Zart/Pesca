/** Código único da turma: quem acerta recebe um cookie e entra no site por um ano. */
export const COOKIE_ACESSO = "idfish_acesso";
export const COOKIE_DURACAO_SEG = 365 * 24 * 3600;

/** Aceita "Traira 42" ou "traira 42 ": ninguém precisa acertar maiúsculas no celular. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toLowerCase();
}

/** O cookie guarda o hash, nunca o código. Trocar o código na Vercel derruba todos os acessos antigos. */
export async function tokenDoCodigo(codigo: string): Promise<string> {
  const dados = new TextEncoder().encode(`idfish:${normalizarCodigo(codigo)}`);
  const hash = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
