-- 1) Reescreve o reagendamento do cliente preservando validações e sincronizando espelhos
CREATE OR REPLACE FUNCTION private.client_reschedule_appointment(
  _customer_id uuid, _appointment_id uuid, _starts_at timestamp with time zone,
  _note text, _actor uuid, _actor_label text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE _a record; _dur integer;
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
  IF _a IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF _a.status IN ('cancelada','concluida') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'closed');
  END IF;

  _dur := COALESCE(_a.duration_minutes, 50);

  -- appointments: nova data, volta para solicitada, link removido.
  -- consumes_credit permanece inalterado: reagendar não consome novo crédito.
  UPDATE public.appointments SET
    starts_at = _starts_at,
    ends_at = _starts_at + make_interval(mins => _dur),
    status = 'solicitada',
    meeting_url = NULL,
    client_notes = COALESCE(NULLIF(btrim(COALESCE(_note,'')),''), client_notes)
  WHERE id = _appointment_id;

  -- espelho Google: volta para pendente preservando google_event_id (PATCH posterior)
  UPDATE public.appointment_calendar_sync SET
    sync_status = 'pendente',
    meet_url = NULL,
    last_error_code = NULL
  WHERE appointment_id = _appointment_id;

  -- espelho mentoria
  UPDATE public.mentorship_sessions SET
    scheduled_at = _starts_at,
    meeting_url = NULL,
    status = 'reagendada',
    confirmed_at = NULL
  WHERE appointment_id = _appointment_id;

  -- espelho S8 (não altera session_date nem conteúdo/conclusão)
  UPDATE public.s8_sessions SET
    scheduled_at = _starts_at,
    meeting_url = NULL
  WHERE appointment_id = _appointment_id;

  INSERT INTO public.appointment_events (appointment_id, event, actor_kind, actor_id, actor_label, comment, client_visible)
  VALUES (_appointment_id, 'reagendamento_solicitado', 'cliente', _actor, _actor_label,
          NULLIF(btrim(COALESCE(_note,'')),''), true);

  INSERT INTO public.audit_logs (actor_id, actor_email, action, target, details)
  VALUES (_actor, _actor_label, 'appointment.reschedule_requested', _appointment_id::text,
          jsonb_build_object('starts_at', _starts_at));

  RETURN jsonb_build_object('ok', true, 'appointment_id', _appointment_id);
END $function$;

-- 2) Privilégio mínimo: nada para PUBLIC/anon/authenticated; EXECUTE só para service_role
REVOKE ALL ON FUNCTION private.client_reschedule_appointment(uuid, uuid, timestamp with time zone, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.client_request_appointment(uuid, uuid, timestamp with time zone, integer, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_reschedule_appointment(uuid, uuid, timestamp with time zone, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_request_appointment(uuid, uuid, timestamp with time zone, integer, text, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.client_reschedule_appointment(uuid, uuid, timestamp with time zone, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.client_request_appointment(uuid, uuid, timestamp with time zone, integer, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.client_reschedule_appointment(uuid, uuid, timestamp with time zone, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.client_request_appointment(uuid, uuid, timestamp with time zone, integer, text, uuid, text) TO service_role;