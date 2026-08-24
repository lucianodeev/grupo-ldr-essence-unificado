# Biblioteca / Plataforma — Parte 2

Implementado:

- Checkout Stripe criado no backend do painel do cliente.
- Pedido pendente é criado antes de redirecionar para Stripe.
- Checkout vincula `user_id`, `order_id` e `product_key`.
- Retorno após pagamento para `/cliente/biblioteca`.
- Webhook em `/api/stripe/webhook`.
- Webhook valida assinatura `STRIPE_WEBHOOK_SECRET`.
- Idempotência por `stripe_webhook_events`.
- Pagamento confirmado atualiza `orders.payment_status = pago`.
- Biblioteca libera o produto apenas quando existe pedido pago do mesmo produto.
- Cancelamento/falha não libera conteúdo.
- Reembolso remove o entitlement implícito ao mudar o pedido para `reembolsado`.
- Histórico continua centralizado em `Meus pedidos`.

## Variáveis necessárias no painel

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_EBOOK_PRICE_BRL`
- `STRIPE_EBOOK_PRICE_EUR`
- `STRIPE_BOOK_PRICE_BRL` (recomendado)
- `STRIPE_BOOK_PRICE_EUR` (recomendado)
- `CLIENT_PANEL_URL=https://painel.ldrrhestrategia.com` (opcional; há fallback seguro)

O livro mantém fallback para os Price IDs já existentes no projeto anterior, mas é recomendado configurar `STRIPE_BOOK_PRICE_BRL` e `STRIPE_BOOK_PRICE_EUR` no ambiente.

## Stripe webhook

Cadastrar no Stripe:

`https://painel.ldrrhestrategia.com/api/stripe/webhook`

Eventos:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`

## Observação

Não coloque chaves Stripe/Supabase dentro do código ou ZIP. Configure-as somente no provedor de hospedagem.
