# IDFish

**Índice de Fisgada** para Cerro Negro (SC): a nota do dia para pescar, por espécie e por hora, com clima real.

## Publicar na Vercel

1. Importe este repositório na Vercel. Nenhuma configuração é necessária: o site já funciona.
2. Sem banco, cada pescaria fica salva só no aparelho de quem registrou.

## Ligar o banco (diário compartilhado, calibração e novos locais)

1. Crie um projeto em [neon.tech](https://neon.tech) e copie a connection string.
2. Na Vercel, em *Settings → Environment Variables*, adicione:
   - `DATABASE_URL`: a connection string do Neon
   - `ADMIN_KEY`: uma senha longa, usada para cadastrar locais em `/locais`
   - `CRON_SECRET`: outro texto longo; protege a gravação diária das previsões
3. No seu computador, crie as tabelas e os locais iniciais, uma única vez:

   ```bash
   DATABASE_URL="cole-aqui" npm run db:setup
   ```

4. Faça um novo deploy na Vercel.

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

Clima: [Open-Meteo](https://open-meteo.com), gratuito para uso não comercial. Se o site passar a ter receita, é preciso um plano pago.
