# Grupo LDR Essence — pacote unificado para Netlify

Este ZIP reúne os dois projetos atuais em um único pacote/repositório, sem misturar responsabilidades:

- `apps/painel-ldr` → `https://painel.ldrrhestrategia.com`
- `apps/luciano-empreendedor` → `https://lucianoempreendendor.com`

## Por que continuam existindo duas pastas?

São dois sites/domínios com runtimes diferentes. O painel é um app TanStack Start full-stack (SSR, rotas de servidor, Supabase e Stripe). O site Luciano Empreendedor é um site estático. Colocar ambos na mesma pasta de publicação quebraria o build e aumentaria o risco de expor rotas/segredos.

O pacote está unificado para você manter **um único ZIP / um único repositório GitHub**, e a Netlify pode criar dois projetos apontando para duas pastas-base do mesmo repositório.

## Publicação — projeto 1 (Painel LDR)

Base directory:

`apps/painel-ldr`

Build command:

`npm run build`

Publish directory:

`dist/client`

O projeto já contém `netlify.toml` e o adaptador oficial `@netlify/vite-plugin-tanstack-start`.

Domínio:

`painel.ldrrhestrategia.com`

### Variáveis obrigatórias do painel

Configure na Netlify, nunca dentro do ZIP:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_EBOOK_PRICE_BRL`
- `STRIPE_EBOOK_PRICE_EUR`
- `STRIPE_BOOK_PRICE_BRL` (se o livro estiver ativo)
- `STRIPE_BOOK_PRICE_EUR` (se o livro estiver ativo)
- `CLIENT_PANEL_URL=https://painel.ldrrhestrategia.com`

Preserve também as demais variáveis já usadas pelo painel (Google Calendar, S8, registros clínicos etc.).

Webhook Stripe do painel:

`https://painel.ldrrhestrategia.com/api/stripe/webhook`

## Publicação — projeto 2 (Luciano Empreendedor)

Base directory:

`apps/luciano-empreendedor`

O `netlify.toml` próprio dessa pasta continua sendo usado.

Domínio:

`lucianoempreendendor.com`

Esse projeto deve permanecer público/estático e direcionar login, plataforma e biblioteca para o Painel LDR, sem duplicar o sistema de cobrança.

## Ordem recomendada

1. Publicar `apps/painel-ldr` em Deploy Preview.
2. Validar login, Biblioteca/Plataforma, bloqueio sem compra, checkout e webhook.
3. Publicar o Painel LDR em produção.
4. Publicar `apps/luciano-empreendedor`.
5. Testar o fluxo completo do site público até o painel.

## Correção Netlify aplicada ao painel

O projeto original usava o wrapper Lovable, cujo build tinha target Nitro/Cloudflare por padrão. Agora, quando `NETLIFY=true`, o projeto:

- desativa o adaptador Nitro do wrapper Lovable;
- ativa `@netlify/vite-plugin-tanstack-start`;
- usa `vite build`;
- publica `dist/client`.

Fora da Netlify, a configuração Lovable original permanece preservada.

## Importante

Este pacote não contém chaves secretas. As variáveis de ambiente devem permanecer no painel da Netlify/Supabase/Stripe.
