import { createHash, timingSafeEqual } from "node:crypto";

/** Aceita "Traira 42" ou "traira 42 ": ninguém precisa acertar maiúsculas no celular. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toLowerCase();
}

const resumo = (s: string) => createHash("sha256").update(normalizarCodigo(s)).digest();

/** O código da turma só é pedido para criar conta. */
export function codigoConfere(digitado: string, certo: string): boolean {
  if (!normalizarCodigo(digitado)) return false;
  return timingSafeEqual(resumo(digitado), resumo(certo));
}
