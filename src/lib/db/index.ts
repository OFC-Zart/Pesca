import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let instancia: Db | null = null;

/** Devolve null sem DATABASE_URL: o site continua funcionando e o diário fica no aparelho. */
export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  instancia ??= drizzle(neon(url), { schema });
  return instancia;
}
