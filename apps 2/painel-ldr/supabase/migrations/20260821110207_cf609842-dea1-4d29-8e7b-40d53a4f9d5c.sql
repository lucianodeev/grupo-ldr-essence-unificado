INSERT INTO public.service_catalog (
  catalog_key, name, category, currency, amount_cents, stripe_payment_link_id,
  billing_model, package_sessions, billing_cadence, repeat_payment_url,
  payment_url, is_clinical, active, sort_order
)
VALUES
  ('psicanalise_pacote_4_eu', 'Psicanálise Clínica — Pacote de 4 sessões', 'psicanalise', 'EUR', 11400, 'plink_1U6pxJKlx2LyNGeBeMk6IMk7', 'package_sessions', 4, 'one_time', 'https://book.stripe.com/6oU9AU7PSgEK0cqbCwfw40X', 'https://book.stripe.com/6oU9AU7PSgEK0cqbCwfw40X', true, true, 90),
  ('psicanalise_pacote_4_br', 'Psicanálise Clínica — Pacote de 4 sessões', 'psicanalise', 'BRL', 68400, 'plink_1U6pxIKlx2LyNGeBzUcBEa9l', 'package_sessions', 4, 'one_time', 'https://book.stripe.com/14A00k6LOewCgboeOIfw40W', 'https://book.stripe.com/14A00k6LOewCgboeOIfw40W', true, true, 91),
  ('psicanalise_pacote_8_eu', 'Psicanálise Clínica — Pacote de 8 sessões', 'psicanalise', 'EUR', 22800, 'plink_1U6pxKKlx2LyNGeBloYSMsAE', 'package_sessions', 8, 'one_time', 'https://book.stripe.com/7sY3cw3zC88ee3geOIfw40Y', 'https://book.stripe.com/7sY3cw3zC88ee3geOIfw40Y', true, true, 92),
  ('psicanalise_pacote_8_br', 'Psicanálise Clínica — Pacote de 8 sessões', 'psicanalise', 'BRL', 136800, 'plink_1U6pxLKlx2LyNGeBq51ieyll', 'package_sessions', 8, 'one_time', 'https://book.stripe.com/00w28s0nq2NUcZc8qkfw40Z', 'https://book.stripe.com/00w28s0nq2NUcZc8qkfw40Z', true, true, 93)
ON CONFLICT (catalog_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  currency = EXCLUDED.currency,
  amount_cents = EXCLUDED.amount_cents,
  stripe_payment_link_id = EXCLUDED.stripe_payment_link_id,
  billing_model = EXCLUDED.billing_model,
  package_sessions = EXCLUDED.package_sessions,
  billing_cadence = EXCLUDED.billing_cadence,
  repeat_payment_url = EXCLUDED.repeat_payment_url,
  payment_url = EXCLUDED.payment_url,
  is_clinical = EXCLUDED.is_clinical,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;