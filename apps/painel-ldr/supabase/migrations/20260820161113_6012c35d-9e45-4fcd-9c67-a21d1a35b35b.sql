-- Enums
DO $$ BEGIN CREATE TYPE public.service_type AS ENUM ('recrutamento_selecao','site','mentoria','produto_digital','palestra','outros'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM ('novo','em_analise','em_andamento','aguardando_cliente','em_revisao','concluido','cancelado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM ('pendente','pago','reembolsado','falhou'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.priority_level AS ENUM ('baixa','media','alta','urgente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.mentorship_status AS ENUM ('intake','aguardando_pagamento','aguardando_agendamento','agendada','em_andamento','concluida','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.delivery_status AS ENUM ('pendente','em_producao','em_revisao','entregue','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  country text,
  language text,
  source text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON public.customers (lower(email)) WHERE email IS NOT NULL AND email <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_authorized ON public.customers;
CREATE POLICY customers_authorized ON public.customers FOR ALL TO authenticated USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));

-- Orders
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  contact_email text,
  contact_phone text,
  service_type public.service_type NOT NULL DEFAULT 'outros',
  title text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  amount_cents integer,
  currency text NOT NULL DEFAULT 'BRL',
  payment_status public.payment_status NOT NULL DEFAULT 'pendente',
  status public.order_status NOT NULL DEFAULT 'novo',
  priority public.priority_level NOT NULL DEFAULT 'media',
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  internal_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_authorized ON public.orders;
CREATE POLICY orders_authorized ON public.orders FOR ALL TO authenticated USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));

-- Order history
CREATE TABLE IF NOT EXISTS public.order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_email text,
  field text NOT NULL,
  old_value text,
  new_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_history_order_idx ON public.order_history(order_id, created_at DESC);
GRANT SELECT, INSERT ON public.order_history TO authenticated;
GRANT ALL ON public.order_history TO service_role;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_history_select ON public.order_history;
CREATE POLICY order_history_select ON public.order_history FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
DROP POLICY IF EXISTS order_history_insert ON public.order_history;
CREATE POLICY order_history_insert ON public.order_history FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));

-- Mentorships
CREATE TABLE IF NOT EXISTS public.mentorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  intake_answers text,
  goal text,
  payment_status public.payment_status NOT NULL DEFAULT 'pendente',
  scheduled_at timestamptz,
  status public.mentorship_status NOT NULL DEFAULT 'intake',
  notes text,
  external_ref text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorships TO authenticated;
GRANT ALL ON public.mentorships TO service_role;
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mentorships_authorized ON public.mentorships;
CREATE POLICY mentorships_authorized ON public.mentorships FOR ALL TO authenticated USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));

-- Deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.delivery_status NOT NULL DEFAULT 'pendente',
  delivery_url text,
  client_note text,
  due_date date,
  delivered_at timestamptz,
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deliveries_authorized ON public.deliveries;
CREATE POLICY deliveries_authorized ON public.deliveries FOR ALL TO authenticated USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));

-- updated_at triggers
DROP TRIGGER IF EXISTS t_customers_updated ON public.customers;
CREATE TRIGGER t_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS t_orders_updated ON public.orders;
CREATE TRIGGER t_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS t_mentorships_updated ON public.mentorships;
CREATE TRIGGER t_mentorships_updated BEFORE UPDATE ON public.mentorships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS t_deliveries_updated ON public.deliveries;
CREATE TRIGGER t_deliveries_updated BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Order number generation
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PED-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS t_orders_number ON public.orders;
CREATE TRIGGER t_orders_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Auditing helper (SECURITY DEFINER so history/audit rows are always written)
CREATE OR REPLACE FUNCTION public.audit_event(_action text, _target text, _details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs (actor_id, actor_email, action, target, details)
  VALUES (auth.uid(), _email, _action, _target, COALESCE(_details, '{}'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.track_order_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_history (order_id, actor_id, actor_email, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), _email, 'criado', NULL, NEW.order_number);
    PERFORM public.audit_event('order.created', NEW.id::text, jsonb_build_object('order_number', NEW.order_number));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_history (order_id, actor_id, actor_email, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), _email, 'status', OLD.status::text, NEW.status::text);
    PERFORM public.audit_event('order.status_changed', NEW.id::text, jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_history (order_id, actor_id, actor_email, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), _email, 'pagamento', OLD.payment_status::text, NEW.payment_status::text);
    PERFORM public.audit_event('order.payment_changed', NEW.id::text, jsonb_build_object('from', OLD.payment_status, 'to', NEW.payment_status));
  END IF;
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    INSERT INTO public.order_history (order_id, actor_id, actor_email, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), _email, 'responsavel', OLD.assignee_id::text, NEW.assignee_id::text);
    PERFORM public.audit_event('order.assigned', NEW.id::text, jsonb_build_object('assignee', NEW.assignee_id));
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.order_history (order_id, actor_id, actor_email, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), _email, 'prioridade', OLD.priority::text, NEW.priority::text);
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.order_history (order_id, actor_id, actor_email, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), _email, 'prazo', OLD.due_date::text, NEW.due_date::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS t_orders_track ON public.orders;
CREATE TRIGGER t_orders_track AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.track_order_changes();

CREATE OR REPLACE FUNCTION public.track_delivery_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_event('delivery.created', NEW.id::text, jsonb_build_object('title', NEW.title));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.audit_event('delivery.status_changed', NEW.id::text, jsonb_build_object('from', OLD.status, 'to', NEW.status));
    IF NEW.order_id IS NOT NULL THEN
      INSERT INTO public.order_history (order_id, actor_id, field, old_value, new_value, note)
      VALUES (NEW.order_id, auth.uid(), 'entrega', OLD.status::text, NEW.status::text, NEW.title);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS t_deliveries_track ON public.deliveries;
CREATE TRIGGER t_deliveries_track AFTER INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.track_delivery_changes();

CREATE OR REPLACE FUNCTION public.track_mentorship_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_event('mentorship.created', NEW.id::text, '{}'::jsonb);
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.audit_event('mentorship.status_changed', NEW.id::text, jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
      PERFORM public.audit_event('mentorship.scheduled', NEW.id::text, jsonb_build_object('at', NEW.scheduled_at));
    END IF;
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      PERFORM public.audit_event('mentorship.payment_changed', NEW.id::text, jsonb_build_object('to', NEW.payment_status));
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS t_mentorships_track ON public.mentorships;
CREATE TRIGGER t_mentorships_track AFTER INSERT OR UPDATE ON public.mentorships FOR EACH ROW EXECUTE FUNCTION public.track_mentorship_changes();