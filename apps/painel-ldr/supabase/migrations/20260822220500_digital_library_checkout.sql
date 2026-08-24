-- Biblioteca digital integrada ao painel do cliente.
-- Produtos no catálogo permitem que pedidos digitais usem a mesma estrutura do painel.
INSERT INTO public.service_catalog
  (catalog_key, name, category, currency, amount_cents, billing_model, package_sessions, is_clinical, active, sort_order)
VALUES
  ('ebook_coragem_comecar', 'A Coragem de Começar', 'produto_digital', 'EUR', 490, 'digital', 0, false, true, 200),
  ('livro_menino_mamao', 'O Menino que Vendia Mamão', 'produto_digital', 'EUR', 2000, 'digital', 0, false, true, 201)
ON CONFLICT (catalog_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  active = true,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_webhook_events TO service_role;
REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_created_idx
  ON public.stripe_webhook_events(created_at DESC);
