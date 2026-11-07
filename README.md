# IDFish

**Índice de Fisgada** para Cerro Negro (SC): a nota do dia para pescar, por espécie e por hora, com clima real.

## Publicar na Vercel

1. Importe este repositório na Vercel. Cada push na `main` publica o site.
2. Em *Storage*, conecte o banco Neon ao projeto. A variável `DATABASE_URL` é criada pela integração, e as tabelas são criadas sozinhas no deploy seguinte.
3. Em *Settings → Environment Variables*, defina:
   - `CODIGO_ACESSO`: o código da turma, inventado por você. É pedido só para criar conta; trocar este valor não derruba quem já entrou.
   - `CRON_SECRET`: um texto longo qualquer; protege a gravação diária das previsões.
4. Faça um novo deploy para as variáveis valerem.

## Como a turma entra

Cada pessoa cria uma conta uma vez, com nome, usuário, senha, fotinha de peixe e o código da turma. Depois, entra só com usuário e senha, e o aparelho continua logado por um ano. Sem banco, ninguém consegue entrar no site publicado.

## Ajustar o índice

Todos os pesos, faixas de temperatura e perfis das espécies ficam em `src/config/indice.ts`.

## Trocar nome ou logo

- Nome: `src/config/site.ts`
- Logo: substitua `assets/logo-original.png`, ajuste os recortes em `scripts/gerar-arte.mjs` e rode `node scripts/gerar-arte.mjs`

## Desenvolvimento

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

Clima: [Open-Meteo](https://open-meteo.com), gratuito para uso não comercial.
