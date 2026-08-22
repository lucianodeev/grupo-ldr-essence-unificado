PLATAFORMA A CORAGEM DE COMEÇAR — CHECKOUT DO LIVRO

Produto Stripe criado: prod_V5ePfTvzhreurx
Preço internacional: €20,00 — price_1U5T6zKlx2LyNGeBuv7dJJsI
Preço Brasil: R$49,90 — price_1U5T7FKlx2LyNGeBMxRYLiDS

ANTES DA VENDA REAL NA NETLIFY
1. Site configuration > Environment variables.
2. Configure STRIPE_SECRET_KEY com a chave secreta LIVE da mesma conta Stripe.
3. Opcional, para liberar o livro também em outros dispositivos após login: configure SUPABASE_SERVICE_ROLE_KEY.
4. SUPABASE_URL já possui fallback para o projeto atual, mas também pode ser definido no ambiente.
5. Faça deploy desta pasta/ZIP.

SEGURANÇA
A chave secreta Stripe nunca fica no index.html. As funções Netlify criam e verificam a Checkout Session no servidor.
O HTML de teste libera apenas uma sessão local de demonstração e não cobra valores.
