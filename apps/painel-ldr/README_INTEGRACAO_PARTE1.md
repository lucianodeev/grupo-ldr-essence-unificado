# Integração Biblioteca / Plataforma — Parte 1

Esta versão integra a experiência de Biblioteca / Plataforma ao painel de cliente existente do Grupo LDR Essence.

## Alterações realizadas

- Nova rota protegida: `/cliente/biblioteca`.
- Nova opção de menu: **Biblioteca / Plataforma**.
- A autenticação apenas identifica o usuário; não libera automaticamente conteúdo pago.
- O estado de acesso é calculado no backend a partir de pedidos pagos do cliente (`orders.payment_status = pago`) e do identificador do produto (`catalog_key` ou `metadata.product_key`).
- Usuário sem direito de acesso vê preço e botão **Comprar**.
- Usuário com direito de acesso vê o estado **Disponível**.
- O site `lucianoempreendendor.com` foi ajustado para encaminhar Plataforma/Biblioteca ao painel LDR e ocultar controles Teste/Admin.
- `admin.lucianoempreendendor.com` é encaminhado ao painel profissional existente.
- O conteúdo integral que estava embutido no HTML público (`conteudo` e `NEW_BOOKS`) foi removido do artefato público.

## Produtos reconhecidos nesta etapa

- `ebook_coragem_comecar` — R$ 9,90 / € 4,90.
- `livro_menino_mamao` — preservado em R$ 49,90 / € 20,00 nesta etapa.

Aliases aceitos para compatibilidade:

- e-book: `ebook_coragem_comecar`, `a_coragem_de_comecar`, `ebook`.
- livro: `livro_menino_mamao`, `menino_mamao`, `livro`.

## Parte 2 ainda necessária

A Parte 2 deve conectar o checkout Stripe ao painel LDR para criar/atualizar os pedidos pagos com o `product_key` correto, processar o webhook, registrar histórico e liberar o acesso automaticamente após o pagamento. Também deve conectar o leitor protegido definitivo dentro do painel.

## Segurança

O arquivo `.env` original não foi incluído neste pacote. Use as variáveis já configuradas no provedor de hospedagem. Um `.env.example` sem valores foi incluído apenas como referência de nomes.
