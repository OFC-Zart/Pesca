# IDFish

**Índice de Fisgada** para Cerro Negro (SC): a nota do dia para pescar, por espécie e por hora, com clima real.

## Publicar na Vercel

1. Importe este repositório na Vercel. Cada push na `main` publica o site.
2. Em *Settings → Environment Variables*, defina:
   - `CODIGO_ACESSO`: o código que a turma digita para entrar. Trocar este valor e fazer um novo deploy derruba os acessos antigos.
   - `CRON_SECRET`: um texto longo qualquer; protege a gravação diária das previsões.
3. Em *Storage*, conecte o banco Neon ao projeto. A variável `DATABASE_URL` é criada pela integração, e as tabelas são criadas sozinhas no deploy seguinte.
4. Faça um novo deploy para as variáveis valerem.

Sem `CODIGO_ACESSO`, o site publicado fica trancado. Sem banco, cada pescaria fica salva só no aparelho de quem registrou.

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
