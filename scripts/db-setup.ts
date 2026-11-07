/** Aplica as migrações e cadastra os locais iniciais. Roda sozinho em cada build; repetir não muda nada. */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { LOCAIS_PADRAO } from "../src/config/indice";
import { locais } from "../src/lib/db/schema";
import { urlDoBanco } from "../src/lib/db/url";

async function main() {
  const url = urlDoBanco();
  if (!url) {
    console.log("Nenhum banco configurado: pulando o preparo das tabelas.");
    return;
  }
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(locais).values(LOCAIS_PADRAO.map((l) => ({ ...l }))).onConflictDoNothing();
  console.log("Banco pronto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
