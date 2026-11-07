/** Aplica as migrações e cadastra os locais iniciais. Rode uma vez: npm run db:setup */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { LOCAIS_PADRAO } from "../src/config/indice";
import { locais } from "../src/lib/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL antes de rodar este comando.");
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(locais).values(LOCAIS_PADRAO.map((l) => ({ ...l }))).onConflictDoNothing();
  console.log("Banco pronto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
