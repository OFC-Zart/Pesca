const URL_POSTGRES = /postgres(?:ql)?:\/\/[^\s'"`]+/;

/** Aproveita a URL mesmo quando ela é colada com sobra, como psql '...' ou entre aspas. */
const extrair = (valor: string | undefined) => valor?.match(URL_POSTGRES)?.[0] ?? null;

function prioridade(nome: string): number {
  if (/DATABASE_URL$/i.test(nome)) return 0;
  if (/POSTGRES_URL$/i.test(nome)) return 1;
  return 2;
}

/**
 * Encontra o banco mesmo com outro nome de variável: a integração da Vercel aceita prefixo
 * (PESCA_DB_DATABASE_URL, por exemplo). As versões sem pool ficam de fora, pois a principal basta.
 */
export function urlDoBanco(env: Record<string, string | undefined> = process.env): string | null {
  const direta = extrair(env.DATABASE_URL);
  if (direta) return direta;
  const nomes = Object.keys(env)
    .filter((n) => !/UNPOOLED|NON_POOLING|NO_SSL/i.test(n))
    .sort((a, b) => prioridade(a) - prioridade(b) || a.localeCompare(b));
  for (const nome of nomes) {
    const url = extrair(env[nome]);
    if (url) return url;
  }
  return null;
}
