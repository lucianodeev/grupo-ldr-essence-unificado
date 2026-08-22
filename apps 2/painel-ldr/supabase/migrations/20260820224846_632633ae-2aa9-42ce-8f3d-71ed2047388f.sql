-- 1. Catálogo
CREATE TABLE IF NOT EXISTS public.service_catalog (
  catalog_key text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'outros',
  currency text NOT NULL DEFAULT 'EUR',
  amount_cents integer NOT NULL,
  stripe_payment_link_id text,
  billing_model text NOT NULL DEFAULT 'project',
  package_sessions integer NOT NULL DEFAULT 0,
  repeat_payment_url text,
  is_clinical boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_catalog TO authenticated;
GRANT ALL ON public.service_catalog TO service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_catalog' AND policyname='service_catalog_select_authorized') THEN
    CREATE POLICY service_catalog_select_authorized ON public.service_catalog
      FOR SELECT TO authenticated USING (private.is_authorized(auth.uid()));
  END IF;
END $$;

DROP TRIGGER IF EXISTS t_service_catalog_updated ON public.service_catalog;
CREATE TRIGGER t_service_catalog_updated BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.service_catalog
  (catalog_key, name, category, currency, amount_cents, stripe_payment_link_id, billing_model, package_sessions, repeat_payment_url, is_clinical, sort_order)
VALUES
 ('psicanalise_clinica_eu','Psicanálise Clínica — Sessão Online','psicanalise','EUR',3000,'plink_1U6aKIKlx2LyNGeB8aNirs1r','single_paid_session',1,'https://book.stripe.com/00w14ofikagm5wKcGAfw40v',true,1),
 ('psicanalise_clinica_br','Psicanálise Clínica — Sessão Online','psicanalise','BRL',18000,'plink_1U6aKBKlx2LyNGeB1bybnJ1u','single_paid_session',1,'https://book.stripe.com/9B68wQ8TWgEKaR48qkfw40u',true,2),
 ('ads_meta_google','Gestão de Anúncios — Meta + Google','ads','EUR',46550,'plink_1U6c52Klx2LyNGeBIk8hJP3l','project',0,NULL,false,3),
 ('ads_uma_plataforma','Gestão de Anúncios — Uma Plataforma','ads','EUR',27550,'plink_1U6c5NKlx2LyNGeB0YoUEBdz','project',0,NULL,false,4),
 ('social_empresarial','Redes Sociais — Plano Empresarial','social','EUR',113050,'plink_1U6c5MKlx2LyNGeBlRhYwX5t','project',0,NULL,false,5),
 ('social_profissional','Redes Sociais — Plano Profissional','social','EUR',75050,'plink_1U6c5OKlx2LyNGeBlAHsiO53','project',0,NULL,false,6),
 ('social_crescimento','Redes Sociais — Plano Crescimento','social','EUR',46550,'plink_1U6c5PKlx2LyNGeBetrlNZCE','project',0,NULL,false,7),
 ('social_inicial','Redes Sociais — Plano Inicial','social','EUR',27550,'plink_1U6c5KKlx2LyNGeByy9rJCxl','project',0,NULL,false,8),
 ('manutencao_empresarial','Manutenção de Site Empresarial','manutencao','EUR',20805,'plink_1U6c5QKlx2LyNGeBNw2RBesY','project',0,NULL,false,9),
 ('manutencao_profissional','Manutenção de Site Profissional','manutencao','EUR',10710,'plink_1U6c5cKlx2LyNGeBy8keQrHE','project',0,NULL,false,10),
 ('manutencao_essencial','Manutenção de Site Essencial','manutencao','EUR',5605,'plink_1U6c5TKlx2LyNGeBNIa2mim9','project',0,NULL,false,11),
 ('diagnostico_projeto','Diagnóstico e Estruturação de Projeto','consultoria','EUR',18050,'plink_1U6c5dKlx2LyNGeBtTNPl6im','project',0,NULL,false,12),
 ('mentoria_8','Mentoria — 8 sessões','mentoria','EUR',44100,'plink_1U6c5eKlx2LyNGeBwkDymd5Y','package_sessions',8,NULL,false,13),
 ('mentoria_4','Mentoria — 4 sessões','mentoria','EUR',24300,'plink_1U6c5iKlx2LyNGeBqmZEPzTl','package_sessions',4,NULL,false,14),
 ('mentoria_sessao','Sessão Individual de Mentoria','mentoria','EUR',7500,'plink_1U6CftKlx2LyNGeBcSqrxWTK','single_paid_session',1,'https://buy.stripe.com/fZueVedac9ci6AOeOIfw40h',false,15),
 ('google_ads_setup','Configuração Inicial Google Ads','ads','EUR',23750,'plink_1U6c5nKlx2LyNGeBJeKlhCcd','project',0,NULL,false,16),
 ('meta_ads_setup','Configuração Inicial Meta Ads','ads','EUR',18050,'plink_1U6c5lKlx2LyNGeBRHfbqqxQ','project',0,NULL,false,17),
 ('email_marketing_conteudo','Conteúdo para E-mail Marketing','conteudo','EUR',8550,'plink_1U6c5gKlx2LyNGeBtSF1aTnT','project',0,NULL,false,18),
 ('criativos_10','Pacote com 10 Criativos','conteudo','EUR',33250,'plink_1U6c5hKlx2LyNGeB8QFBideZ','project',0,NULL,false,19),
 ('criativos_5','Pacote com 5 Criativos','conteudo','EUR',18050,'plink_1U6c5pKlx2LyNGeBUCur1V41','project',0,NULL,false,20),
 ('identidade_visual_entrada','Identidade Visual Básica — Entrada 50%','design','EUR',18525,'plink_1U6c5qKlx2LyNGeBhKjTKwaY','project',0,NULL,false,21),
 ('plano_marketing','Plano Estratégico de Marketing','consultoria','EUR',26100,'plink_1U6c5rKlx2LyNGeBoru9JRq1','project',0,NULL,false,22),
 ('diagnostico_digital','Diagnóstico de Presença Digital','consultoria','EUR',9405,'plink_1U6c5uKlx2LyNGeB6G9PkrYu','project',0,NULL,false,23),
 ('loja_virtual_entrada','Loja Virtual Básica — Entrada 50%','site','EUR',85025,'plink_1U6c5tKlx2LyNGeB6QIZU3PS','project',0,NULL,false,24),
 ('catalogo_digital_entrada','Catálogo Digital — Entrada 50%','site','EUR',47025,'plink_1U6c5vKlx2LyNGeBHgkeMuua','project',0,NULL,false,25),
 ('site_empresarial_entrada','Site Empresarial — Entrada 50%','site','EUR',66025,'plink_1U6c5zKlx2LyNGeBVllmzy4K','project',0,NULL,false,26),
 ('site_institucional_entrada','Site Institucional — Entrada 50%','site','EUR',40050,'plink_1U6c5xKlx2LyNGeBoy7B5W2b','project',0,NULL,false,27),
 ('site_one_page','Site One Page','site','EUR',56050,'plink_1U6c5yKlx2LyNGeBGSkxXZFJ','project',0,NULL,false,28),
 ('landing_page','Landing Page Profissional','site','EUR',44100,'plink_1U6c60Klx2LyNGeBMOmav0Sc','project',0,NULL,false,29)
ON CONFLICT (catalog_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  currency = EXCLUDED.currency,
  amount_cents = EXCLUDED.amount_cents,
  stripe_payment_link_id = EXCLUDED.stripe_payment_link_id,
  billing_model = EXCLUDED.billing_model,
  package_sessions = EXCLUDED.package_sessions,
  repeat_payment_url = EXCLUDED.repeat_payment_url,
  is_clinical = EXCLUDED.is_clinical,
  sort_order = EXCLUDED.sort_order;

-- 2. Campos aditivos em orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS catalog_key text REFERENCES public.service_catalog(catalog_key);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'painel';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_ref text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_payment_link_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_request boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS orders_external_ref_key ON public.orders(external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_catalog_idx ON public.orders(catalog_key);
CREATE INDEX IF NOT EXISTS customers_auth_user_idx ON public.customers(auth_user_id);

-- 3. Agendamentos
DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM ('solicitada','agendada','confirmada','concluida','cancelada','reagendada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  mentorship_id uuid REFERENCES public.mentorships(id) ON DELETE SET NULL,
  catalog_key text REFERENCES public.service_catalog(catalog_key),
  title text NOT NULL DEFAULT 'Sessão',
  status public.appointment_status NOT NULL DEFAULT 'solicitada',
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 50,
  meeting_url text,
  client_notes text,
  internal_notes text,
  client_visible boolean NOT NULL DEFAULT true,
  consumes_credit boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_customer_idx ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS appointments_order_idx ON public.appointments(order_id);
CREATE INDEX IF NOT EXISTS appointments_starts_idx ON public.appointments(starts_at);

GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointments' AND policyname='appointments_authorized') THEN
    CREATE POLICY appointments_authorized ON public.appointments
      FOR ALL TO authenticated
      USING (private.is_authorized(auth.uid()))
      WITH CHECK (private.is_authorized(auth.uid()));
  END IF;
END $$;

DROP TRIGGER IF EXISTS t_appointments_updated ON public.appointments;
CREATE TRIGGER t_appointments_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.appointment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event text NOT NULL,
  actor_kind text NOT NULL DEFAULT 'equipe',
  actor_id uuid,
  actor_label text,
  comment text,
  client_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_events_appointment_idx ON public.appointment_events(appointment_id);

GRANT SELECT, INSERT ON public.appointment_events TO authenticated;
GRANT ALL ON public.appointment_events TO service_role;
ALTER TABLE public.appointment_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointment_events' AND policyname='appointment_events_select_authorized') THEN
    CREATE POLICY appointment_events_select_authorized ON public.appointment_events
      FOR SELECT TO authenticated USING (private.is_authorized(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointment_events' AND policyname='appointment_events_insert_authorized') THEN
    CREATE POLICY appointment_events_insert_authorized ON public.appointment_events
      FOR INSERT TO authenticated WITH CHECK (private.is_authorized(auth.uid()));
  END IF;
END $$;

-- 4. Créditos de sessão
CREATE TABLE IF NOT EXISTS public.session_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  catalog_key text,
  granted integer NOT NULL DEFAULT 0 CHECK (granted >= 0),
  source text NOT NULL DEFAULT 'pagamento',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_credits_customer_idx ON public.session_credits(customer_id);

GRANT SELECT ON public.session_credits TO authenticated;
GRANT ALL ON public.session_credits TO service_role;
ALTER TABLE public.session_credits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_credits' AND policyname='session_credits_select_authorized') THEN
    CREATE POLICY session_credits_select_authorized ON public.session_credits
      FOR SELECT TO authenticated USING (private.is_authorized(auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.grant_order_credits(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $fn$
DECLARE _o record; _c record; _grant integer;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF _o IS NULL OR _o.payment_status <> 'pago' OR _o.catalog_key IS NULL THEN RETURN; END IF;
  SELECT * INTO _c FROM public.service_catalog WHERE catalog_key = _o.catalog_key;
  IF _c IS NULL THEN RETURN; END IF;

  IF _c.billing_model = 'single_paid_session' THEN _grant := 1;
  ELSIF _c.billing_model = 'package_sessions' THEN _grant := GREATEST(_c.package_sessions, 0);
  ELSE _grant := 0;
  END IF;

  IF _grant = 0 THEN RETURN; END IF;

  INSERT INTO public.session_credits (order_id, customer_id, catalog_key, granted)
  VALUES (_o.id, _o.customer_id, _o.catalog_key, _grant)
  ON CONFLICT (order_id) DO NOTHING;
END $fn$;

REVOKE ALL ON FUNCTION private.grant_order_credits(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.grant_order_credits(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.grant_order_credits(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.tg_orders_grant_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $fn$
BEGIN
  IF NEW.payment_status = 'pago' THEN
    PERFORM private.grant_order_credits(NEW.id);
  END IF;
  RETURN NEW;
END $fn$;

REVOKE ALL ON FUNCTION public.tg_orders_grant_credits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_orders_grant_credits() FROM anon;
REVOKE ALL ON FUNCTION public.tg_orders_grant_credits() FROM authenticated;

DROP TRIGGER IF EXISTS t_orders_grant_credits ON public.orders;
CREATE TRIGGER t_orders_grant_credits AFTER INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_grant_credits();

CREATE OR REPLACE FUNCTION public.tg_appointments_check_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $fn$
DECLARE _granted integer; _used integer;
BEGIN
  IF NEW.order_id IS NULL OR NEW.consumes_credit = false THEN RETURN NEW; END IF;
  SELECT COALESCE(granted, 0) INTO _granted FROM public.session_credits WHERE order_id = NEW.order_id;
  IF _granted IS NULL THEN _granted := 0; END IF;
  IF _granted = 0 THEN RETURN NEW; END IF;

  SELECT count(*) INTO _used FROM public.appointments
   WHERE order_id = NEW.order_id AND consumes_credit AND status <> 'cancelada' AND id <> NEW.id;

  IF _used >= _granted THEN
    RAISE EXCEPTION 'Sem crédito de sessão disponível para este pedido.';
  END IF;
  RETURN NEW;
END $fn$;

REVOKE ALL ON FUNCTION public.tg_appointments_check_credit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_appointments_check_credit() FROM anon;
REVOKE ALL ON FUNCTION public.tg_appointments_check_credit() FROM authenticated;

DROP TRIGGER IF EXISTS t_appointments_check_credit ON public.appointments;
CREATE TRIGGER t_appointments_check_credit BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_appointments_check_credit();

-- 5. Integração com o site principal
CREATE TABLE IF NOT EXISTS private.integration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  token_sha256 text NOT NULL UNIQUE,
  label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
REVOKE ALL ON private.integration_tokens FROM PUBLIC;
REVOKE ALL ON private.integration_tokens FROM anon;
REVOKE ALL ON private.integration_tokens FROM authenticated;
GRANT ALL ON private.integration_tokens TO service_role;

CREATE TABLE IF NOT EXISTS public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz,
  status text NOT NULL DEFAULT 'processado',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, event_id)
);
CREATE INDEX IF NOT EXISTS integration_events_created_idx ON public.integration_events(created_at DESC);

GRANT SELECT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='integration_events' AND policyname='integration_events_select_superadmin') THEN
    CREATE POLICY integration_events_select_superadmin ON public.integration_events
      FOR SELECT TO authenticated USING (private.is_superadmin(auth.uid()));
  END IF;
END $$;

-- 6. Prontuário de Psicanálise (fechado: apenas service_role)
CREATE TABLE IF NOT EXISTS public.clinical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  session_number integer,
  session_date date,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinical_records_customer_idx ON public.clinical_records(customer_id);

CREATE TABLE IF NOT EXISTS public.clinical_record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.clinical_records(id) ON DELETE CASCADE,
  version integer NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  algo text NOT NULL DEFAULT 'aes-256-gcm',
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_id, version)
);

CREATE TABLE IF NOT EXISTS public.clinical_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.clinical_records(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinical_access_logs_created_idx ON public.clinical_access_logs(created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clinical_records','clinical_record_versions','clinical_attachments','clinical_access_logs'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS t_clinical_records_updated ON public.clinical_records;
CREATE TRIGGER t_clinical_records_updated BEFORE UPDATE ON public.clinical_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();