-- =========================================================
-- ÁREA DO CLIENTE — vínculo de conta, sessões e revisões
-- =========================================================

-- 1) Vínculo entre auth.users e customers (um cadastro por e-mail)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS portal_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_linked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS customers_auth_user_id_key
  ON public.customers (auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_ci
  ON public.customers (lower(email)) WHERE email IS NOT NULL;

-- 2) Campos de mentoria destinados ao cliente
ALTER TABLE public.mentorships
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS client_summary text,
  ADD COLUMN IF NOT EXISTS next_steps text;

-- 3) Entregas: visibilidade e ciclo de aprovação do cliente
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS needs_client_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- 4) Sessões de mentoria (agenda + link de videochamada compartilhado)
DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('agendada','concluida','cancelada','reagendada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.mentorship_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id uuid NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Sessão de mentoria',
  session_number smallint,
  scheduled_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 50,
  meeting_url text,
  status public.session_status NOT NULL DEFAULT 'agendada',
  client_notes text,
  internal_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorship_sessions TO authenticated;
GRANT ALL ON public.mentorship_sessions TO service_role;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mentorship_sessions_authorized ON public.mentorship_sessions;
CREATE POLICY mentorship_sessions_authorized ON public.mentorship_sessions
  FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid()))
  WITH CHECK (private.is_authorized(auth.uid()));

DROP TRIGGER IF EXISTS t_mentorship_sessions_updated ON public.mentorship_sessions;
CREATE TRIGGER t_mentorship_sessions_updated BEFORE UPDATE ON public.mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS mentorship_sessions_mentorship_idx
  ON public.mentorship_sessions (mentorship_id, scheduled_at);

-- 5) Histórico imutável de revisões de entrega (aprovação / ajustes)
DO $$ BEGIN
  CREATE TYPE public.delivery_event_type AS ENUM
    ('entregue','aprovada','ajuste_solicitado','comentario','revisada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  event public.delivery_event_type NOT NULL,
  comment text,
  actor_kind text NOT NULL DEFAULT 'equipe',
  actor_id uuid,
  actor_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.delivery_events TO authenticated;
GRANT ALL ON public.delivery_events TO service_role;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_events_select_authorized ON public.delivery_events;
CREATE POLICY delivery_events_select_authorized ON public.delivery_events
  FOR SELECT TO authenticated USING (private.is_authorized(auth.uid()));

DROP POLICY IF EXISTS delivery_events_insert_authorized ON public.delivery_events;
CREATE POLICY delivery_events_insert_authorized ON public.delivery_events
  FOR INSERT TO authenticated WITH CHECK (private.is_authorized(auth.uid()));

CREATE INDEX IF NOT EXISTS delivery_events_delivery_idx
  ON public.delivery_events (delivery_id, created_at DESC);

-- 6) Helper (schema private, fora da API) para resolver o cliente logado
CREATE OR REPLACE FUNCTION private.current_customer_id(_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers
  WHERE auth_user_id = _uid AND portal_active = true
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.current_customer_id(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_customer_id(uuid) TO service_role;

-- 7) Sem privilégios diretos para anon nas novas tabelas
REVOKE ALL ON public.mentorship_sessions FROM anon;
REVOKE ALL ON public.delivery_events FROM anon;