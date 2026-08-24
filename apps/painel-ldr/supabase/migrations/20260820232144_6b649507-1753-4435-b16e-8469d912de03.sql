-- Catálogo: link público de pagamento separado do link de recompra
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS payment_url text;

WITH links(k, u) AS (VALUES
  ('psicanalise_clinica_eu','https://book.stripe.com/00w14ofikagm5wKcGAfw40v'),
  ('psicanalise_clinica_br','https://book.stripe.com/9B68wQ8TWgEKaR48qkfw40u'),
  ('ads_meta_google','https://buy.stripe.com/7sYaEY0nqgEKgbo9uofw40w'),
  ('ads_uma_plataforma','https://buy.stripe.com/4gM14o9Y0dsy5wKfSMfw40z'),
  ('social_empresarial','https://buy.stripe.com/dRm5kE7PS74a1gucGAfw40y'),
  ('social_profissional','https://buy.stripe.com/fZueVe0nq9ci1gueOIfw40A'),
  ('social_crescimento','https://buy.stripe.com/28EfZifikdsy1gubCwfw40B'),
  ('social_inicial','https://buy.stripe.com/cNi5kE9Y01JQ6AOcGAfw40x'),
  ('manutencao_empresarial','https://buy.stripe.com/3cI5kEgmobkqgbo0XSfw40C'),
  ('manutencao_profissional','https://buy.stripe.com/3cI8wQ8TW9ci6AOcGAfw40E'),
  ('manutencao_essencial','https://buy.stripe.com/14A7sMfik0FMaR4cGAfw40D'),
  ('diagnostico_projeto','https://buy.stripe.com/8x25kE3zC74abV88qkfw40F'),
  ('mentoria_8','https://buy.stripe.com/9B64gAeeg88e2kyeOIfw40G'),
  ('mentoria_4','https://buy.stripe.com/cNi7sM6LOdsy6AOaysfw40J'),
  ('mentoria_sessao','https://buy.stripe.com/fZueVedac9ci6AOeOIfw40h'),
  ('google_ads_setup','https://buy.stripe.com/28E9AU3zC2NU5wKbCwfw40L'),
  ('meta_ads_setup','https://buy.stripe.com/cNi14o4DG2NUbV88qkfw40K'),
  ('email_marketing_conteudo','https://buy.stripe.com/bJeaEY8TWcoubV8gWQfw40H'),
  ('criativos_10','https://buy.stripe.com/6oU6oIeeg4W2f7keOIfw40I'),
  ('criativos_5','https://buy.stripe.com/cNidRac68gEK5wK6icfw40M'),
  ('identidade_visual_entrada','https://buy.stripe.com/28E8wQ9Y0dsy3oCcGAfw40N'),
  ('plano_marketing','https://buy.stripe.com/28E7sM8TWewC9N0dKEfw40O'),
  ('diagnostico_digital','https://buy.stripe.com/7sYcN65HK74ae3g7mgfw40Q'),
  ('loja_virtual_entrada','https://buy.stripe.com/dRm28s9Y01JQe3g4a4fw40P'),
  ('catalogo_digital_entrada','https://buy.stripe.com/9B63cw1rugEK9N09uofw40R'),
  ('site_empresarial_entrada','https://buy.stripe.com/aFa28s3zC3RY7ESaysfw40U'),
  ('site_institucional_entrada','https://buy.stripe.com/9B65kE9Y0agm2ky6icfw40S'),
  ('site_one_page','https://buy.stripe.com/8x25kEfikdsycZc8qkfw40T'),
  ('landing_page','https://buy.stripe.com/14AaEY3zC9cigbo4a4fw40V')
)
UPDATE public.service_catalog sc
   SET payment_url = links.u
  FROM links
 WHERE sc.catalog_key = links.k
   AND sc.payment_url IS DISTINCT FROM links.u;

-- Recompra de sessão avulsa aponta para o mesmo link oficial quando ausente
UPDATE public.service_catalog
   SET repeat_payment_url = payment_url
 WHERE billing_model = 'single_paid_session'
   AND repeat_payment_url IS NULL
   AND payment_url IS NOT NULL;

-- Cadência: apenas os 9 recorrentes são mensais
UPDATE public.service_catalog
   SET billing_cadence = CASE
     WHEN catalog_key IN (
       'ads_meta_google','ads_uma_plataforma','social_empresarial','social_profissional',
       'social_crescimento','social_inicial','manutencao_empresarial','manutencao_profissional',
       'manutencao_essencial') THEN 'monthly' ELSE 'one_time' END
 WHERE billing_cadence IS DISTINCT FROM (CASE
     WHEN catalog_key IN (
       'ads_meta_google','ads_uma_plataforma','social_empresarial','social_profissional',
       'social_crescimento','social_inicial','manutencao_empresarial','manutencao_profissional',
       'manutencao_essencial') THEN 'monthly' ELSE 'one_time' END);

-- Mínimo privilégio: anon nunca acessa agenda, catálogo, créditos ou integrações
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.appointment_events FROM anon;
REVOKE ALL ON public.service_catalog FROM anon;
REVOKE ALL ON public.session_credits FROM anon;
REVOKE ALL ON public.integration_events FROM anon;

-- Catálogo só é alterado por server function (service_role)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.service_catalog FROM authenticated;
GRANT SELECT ON public.service_catalog TO authenticated;
GRANT ALL ON public.service_catalog TO service_role;