-- 1. trava utilitária por pedido
CREATE OR REPLACE FUNCTION private.lock_order(_order_id uuid)
RETURNS void LANGUAGE sql SET search_path TO 'public','private' AS $$
  SELECT pg_advisory_xact_lock(hashtextextended(coalesce(_order_id::text,'no-order'), 0))
$$;

-- 2. concessão de créditos com trava
CREATE OR REPLACE FUNCTION private.grant_order_credits(_order_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private'
AS $function$
DECLARE _o record; _c record; _grant integer;
BEGIN
  PERFORM private.lock_order(_order_id);
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
END $function$;

-- 3. checagem de crédito com trava
CREATE OR REPLACE FUNCTION public.tg_appointments_check_credit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private'
AS $function$
DECLARE _granted integer; _used integer;
BEGIN
  IF NEW.order_id IS NULL OR NEW.consumes_credit = false THEN RETURN NEW; END IF;
  PERFORM private.lock_order(NEW.order_id);
  SELECT COALESCE(granted, 0) INTO _granted FROM public.session_credits WHERE order_id = NEW.order_id;
  IF _granted IS NULL THEN _granted := 0; END IF;
  IF _granted = 0 THEN RETURN NEW; END IF;

  SELECT count(*) INTO _used FROM public.appointments
   WHERE order_id = NEW.order_id AND consumes_credit AND status <> 'cancelada' AND id <> NEW.id;

  IF _used >= _granted THEN
    RAISE EXCEPTION 'Sem crédito de sessão disponível para este pedido.';
  END IF;
  RETURN NEW;
END $function$;

-- 4. limite de sessões por pedido (regra canônica)
CREATE OR REPLACE FUNCTION private.order_session_rule(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public','private'
AS $$
DECLARE _o record; _c record; _granted integer; _kind text; _limit integer;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF _o IS NULL THEN RETURN jsonb_build_object('kind','unknown','limit',0); END IF;
  SELECT * INTO _c FROM public.service_catalog WHERE catalog_key = _o.catalog_key;
  SELECT granted INTO _granted FROM public.session_credits WHERE order_id = _o.id;

  IF _c IS NOT NULL AND _c.billing_model = 'single_paid_session' THEN
    _kind := 'single'; _limit := 1;
  ELSIF _c IS NOT NULL AND _c.billing_model = 'package_sessions' THEN
    _kind := 'package'; _limit := GREATEST(COALESCE(_granted, _c.package_sessions, 0), 0);
  ELSIF _o.service_type = 'mentoria' THEN
    _kind := 'single'; _limit := GREATEST(COALESCE(_granted, 1), 1);
  ELSE
    _kind := 'project'; _limit := NULL;
  END IF;

  RETURN jsonb_build_object('kind', _kind, 'limit', _limit);
END $$;

-- 5. solicitação de agendamento (transacional)
CREATE OR REPLACE FUNCTION private.client_request_appointment(
  _customer_id uuid, _order_id uuid, _starts_at timestamptz, _duration integer,
  _note text, _actor uuid, _actor_label text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private'
AS $$
DECLARE _o record; _c record; _rule jsonb; _kind text; _limit integer;
        _used integer; _open integer; _consumes boolean; _title text; _id uuid; _dur integer;
BEGIN
  IF _customer_id IS NULL OR _order_id IS NULL OR _starts_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;
  IF _starts_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'past_date');
  END IF;

  PERFORM private.lock_order(_order_id);

  SELECT * INTO _o FROM public.orders WHERE id = _order_id AND customer_id = _customer_id FOR UPDATE;
  IF _o IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF _o.payment_status <> 'pago' THEN RETURN jsonb_build_object('ok', false, 'error', 'not_paid'); END IF;

  SELECT * INTO _c FROM public.service_catalog WHERE catalog_key = _o.catalog_key;
  _rule := private.order_session_rule(_order_id);
  _kind := _rule->>'kind';
  _limit := NULLIF(_rule->>'limit','')::integer;
  _consumes := _kind IN ('single','package');
  _dur := GREATEST(LEAST(COALESCE(_duration, 50), 240), 15);

  IF _consumes THEN
    SELECT count(*) INTO _used FROM public.appointments
      WHERE order_id = _o.id AND consumes_credit AND status <> 'cancelada';
    IF _limit IS NULL OR _used >= _limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'no_credit');
    END IF;
  ELSE
    SELECT count(*) INTO _open FROM public.appointments
      WHERE order_id = _o.id AND status IN ('solicitada','agendada','confirmada','reagendada');
    IF _open >= 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'open_meeting');
    END IF;
  END IF;

  _title := COALESCE(_c.name, _o.title, 'Sessão');

  INSERT INTO public.appointments (
    order_id, customer_id, catalog_key, title, status, starts_at, ends_at,
    duration_minutes, client_notes, client_visible, consumes_credit, created_by
  ) VALUES (
    _o.id, _customer_id, _o.catalog_key, _title, 'solicitada', _starts_at,
    _starts_at + make_interval(mins => _dur), _dur, NULLIF(btrim(COALESCE(_note,'')),''),
    true, _consumes, NULL
  ) RETURNING id INTO _id;

  INSERT INTO public.appointment_events (appointment_id, event, actor_kind, actor_id, actor_label, comment, client_visible)
  VALUES (_id, 'solicitada', 'cliente', _actor, _actor_label, NULLIF(btrim(COALESCE(_note,'')),''), true);

  INSERT INTO public.audit_logs (actor_id, actor_email, action, target, details)
  VALUES (_actor, _actor_label, 'appointment.requested', _id::text,
          jsonb_build_object('order_id', _o.id, 'kind', _kind));

  RETURN jsonb_build_object('ok', true, 'appointment_id', _id);
END $$;

-- 6. reagendamento (transacional, não consome crédito)
CREATE OR REPLACE FUNCTION private.client_reschedule_appointment(
  _customer_id uuid, _appointment_id uuid, _starts_at timestamptz,
  _note text, _actor uuid, _actor_label text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private'
AS $$
DECLARE _a record;
BEGIN
  IF _customer_id IS NULL OR _appointment_id IS NULL OR _starts_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;
  IF _starts_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'past_date');
  END IF;

  SELECT * INTO _a FROM public.appointments
    WHERE id = _appointment_id AND customer_id = _customer_id;
  IF _a IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  PERFORM private.lock_order(_a.order_id);

  SELECT * INTO _a FROM public.appointments
    WHERE id = _appointment_id AND customer_id = _customer_id FOR UPDATE;
  IF _a.status IN ('cancelada','concluida') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'closed');
  END IF;

  UPDATE public.appointments SET
    starts_at = _starts_at,
    ends_at = _starts_at + make_interval(mins => COALESCE(_a.duration_minutes, 50)),
    status = 'solicitada',
    meeting_url = NULL,
    client_notes = COALESCE(NULLIF(btrim(COALESCE(_note,'')),''), client_notes)
  WHERE id = _appointment_id;

  INSERT INTO public.appointment_events (appointment_id, event, actor_kind, actor_id, actor_label, comment, client_visible)
  VALUES (_appointment_id, 'reagendamento_solicitado', 'cliente', _actor, _actor_label,
          NULLIF(btrim(COALESCE(_note,'')),''), true);

  INSERT INTO public.audit_logs (actor_id, actor_email, action, target, details)
  VALUES (_actor, _actor_label, 'appointment.reschedule_requested', _appointment_id::text,
          jsonb_build_object('starts_at', _starts_at));

  RETURN jsonb_build_object('ok', true, 'appointment_id', _appointment_id);
END $$;

-- 7. wrappers públicos restritos ao service_role
CREATE OR REPLACE FUNCTION public.client_request_appointment(
  _customer_id uuid, _order_id uuid, _starts_at timestamptz, _duration integer,
  _note text, _actor uuid, _actor_label text
) RETURNS jsonb LANGUAGE sql SET search_path TO 'public','private' AS $$
  SELECT private.client_request_appointment(_customer_id, _order_id, _starts_at, _duration, _note, _actor, _actor_label)
$$;

CREATE OR REPLACE FUNCTION public.client_reschedule_appointment(
  _customer_id uuid, _appointment_id uuid, _starts_at timestamptz,
  _note text, _actor uuid, _actor_label text
) RETURNS jsonb LANGUAGE sql SET search_path TO 'public','private' AS $$
  SELECT private.client_reschedule_appointment(_customer_id, _appointment_id, _starts_at, _note, _actor, _actor_label)
$$;

REVOKE ALL ON FUNCTION public.client_request_appointment(uuid, uuid, timestamptz, integer, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_reschedule_appointment(uuid, uuid, timestamptz, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_request_appointment(uuid, uuid, timestamptz, integer, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.client_reschedule_appointment(uuid, uuid, timestamptz, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION private.lock_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.order_session_rule(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.client_request_appointment(uuid, uuid, timestamptz, integer, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.client_reschedule_appointment(uuid, uuid, timestamptz, text, uuid, text) FROM PUBLIC, anon, authenticated;

-- 8. confirmação explícita das sessões S8/mentoria (sem alterar enum existente)
ALTER TABLE public.mentorship_sessions ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.mentorship_sessions ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id);
CREATE UNIQUE INDEX IF NOT EXISTS mentorship_sessions_appointment_key
  ON public.mentorship_sessions (appointment_id) WHERE appointment_id IS NOT NULL;