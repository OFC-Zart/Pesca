import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { urlDoBanco } from "./url";

export type Db = NeonHttpDatabase<typeof schema>;

let instancia: Db | null = null;

/** Devolve null quando nenhum banco foi configurado. */
export function getDb(): Db | null {
  const url = urlDoBanco();
  if (!url) return null;
  instancia ??= drizzle(neon(url), { schema });
  return instancia;
}
