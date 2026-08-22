-- Aditiva/idempotente: confirmação de agenda transacional + fail-closed nas RPCs.

CREATE OR REPLACE FUNCTION private.sync_appointment_session(
  _appointment_id uuid,
  _scheduled timestamptz,
  _duration integer,
  _meeting text,
  _title text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  _appt public.appointments%ROWTYPE;
  _mentorship public.mentorships%ROWTYPE;
  _granted integer := 0;
  _limit integer;
  _session_id uuid;
  _number integer;
BEGIN
  SELECT * INTO _appt FROM public.appointments WHERE id = _appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;
  IF _appt.order_id IS NULL THEN
    RETURN jsonb_build_object('linked', false);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('order:' || _appt.order_id::text, 0));

  SELECT * INTO _mentorship FROM public.mentorships WHERE order_id = _appt.order_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('linked', false);
  END IF;

  SELECT COALESCE(granted, 0) INTO _granted
    FROM public.session_credits WHERE order_id = _appt.order_id;
  _granted := COALESCE(_granted, 0);

  SELECT id, session_number INTO _session_id, _number
    FROM public.mentorship_sessions WHERE appointment_id = _appointment_id;

  IF _session_id IS NOT NULL THEN
    -- Idempotente pelo appointment_id: só atualiza agenda/videochamada.
    UPDATE public.mentorship_sessions
       SET scheduled_at = _scheduled,
           duration_minutes = COALESCE(_duration, duration_minutes),
           meeting_url = _meeting,
           status = 'agendada',
           confirmed_at = now()
     WHERE id = _session_id;
  ELSE
    -- Sessão nova exige crédito válido do pacote (4/8) ou sessão avulsa paga.
    IF _appt.consumes_credit THEN
      IF _granted <= 0 THEN
        RAISE EXCEPTION 'Pedido sem créditos de sessão.';
      END IF;
      _limit := _granted;
    ELSE
      _limit := 8;
    END IF;

    SELECT COALESCE(max(session_number), 0) + 1 INTO _number
      FROM public.mentorship_sessions WHERE mentorship_id = _mentorship.id;

    IF _number > _limit OR _number > 8 THEN
      RAISE EXCEPTION 'Pacote sem sessões restantes.';
    END IF;

    INSERT INTO public.mentorship_sessions (
      mentorship_id, appointment_id, title, session_number,
      scheduled_at, duration_minutes, meeting_url, status, confirmed_at
    ) VALUES (
      _mentorship.id, _appointment_id, COALESCE(_title, 'Sessão'), _number,
      _scheduled, COALESCE(_duration, 50), _meeting, 'agendada', now()
    )
    RETURNING id INTO _session_id;
  END IF;

  IF _mentorship.participant_id IS NOT NULL AND _number BETWEEN 1 AND 8 THEN
    INSERT INTO public.s8_sessions (
      participant_id, session_number, appointment_id, scheduled_at, meeting_url, session_date
    ) VALUES (
      _mentorship.participant_id, _number, _appointment_id, _scheduled, _meeting, _scheduled::date
    )
    ON CONFLICT (participant_id, session_number) DO UPDATE
      SET appointment_id = COALESCE(public.s8_sessions.appointment_id, EXCLUDED.appointment_id),
          scheduled_at   = EXCLUDED.scheduled_at,
          meeting_url    = EXCLUDED.meeting_url,
          session_date   = COALESCE(public.s8_sessions.session_date, EXCLUDED.session_date)
      WHERE public.s8_sessions.appointment_id IS NULL
         OR public.s8_sessions.appointment_id = EXCLUDED.appointment_id;
  END IF;

  RETURN jsonb_build_object('linked', true, 'session_number', _number);
END $$;

-- Confirmação de agendamento: appointment + mentorship_sessions + s8_sessions
-- numa única transação. Qualquer erro derruba tudo (rollback implícito).
CREATE OR REPLACE FUNCTION private.confirm_appointment_tx(
  _appointment_id uuid,
  _starts timestamptz,
  _duration integer,
  _meeting text,
  _client_note text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _appt public.appointments%ROWTYPE; _sync jsonb;
BEGIN
  SELECT * INTO _appt FROM public.appointments WHERE id = _appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('order:' || COALESCE(_appt.order_id::text, _appointment_id::text), 0));

  UPDATE public.appointments
     SET status = 'confirmada',
         starts_at = _starts,
         ends_at = _starts + make_interval(mins => COALESCE(_duration, duration_minutes, 50)),
         duration_minutes = COALESCE(_duration, duration_minutes, 50),
         meeting_url = _meeting,
         client_visible = true,
         client_notes = COALESCE(NULLIF(_client_note, ''), client_notes)
   WHERE id = _appointment_id;

  _sync := private.sync_appointment_session(
    _appointment_id, _starts, COALESCE(_duration, _appt.duration_minutes, 50), _meeting, _appt.title);

  RETURN jsonb_build_object('ok', true, 'sync', _sync);
END $$;

-- Confirmação a partir da sessão de mentoria: mantém sessão, S8 e appointment
-- coerentes na mesma transação.
CREATE OR REPLACE FUNCTION private.confirm_mentorship_session_tx(
  _session_id uuid,
  _scheduled timestamptz,
  _meeting text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _s public.mentorship_sessions%ROWTYPE; _order uuid;
BEGIN
  SELECT * INTO _s FROM public.mentorship_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão não encontrada.';
  END IF;

  SELECT order_id INTO _order FROM public.mentorships WHERE id = _s.mentorship_id;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('order:' || COALESCE(_order::text, _session_id::text), 0));

  UPDATE public.mentorship_sessions
     SET scheduled_at = _scheduled,
         meeting_url = _meeting,
         status = 'agendada',
         confirmed_at = now()
   WHERE id = _session_id;

  IF _s.appointment_id IS NOT NULL THEN
    UPDATE public.appointments
       SET status = 'confirmada',
           starts_at = _scheduled,
           ends_at = _scheduled + make_interval(mins => COALESCE(duration_minutes, 50)),
           meeting_url = _meeting,
           client_visible = true
     WHERE id = _s.appointment_id;

    UPDATE public.s8_sessions
       SET scheduled_at = _scheduled,
           meeting_url = _meeting
     WHERE appointment_id = _s.appointment_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END $$;

-- Prontuário: cabeçalho + versão cifrada + trilha numa única transação.
CREATE OR REPLACE FUNCTION private.save_clinical_record_tx(
  _record_id uuid,
  _customer_id uuid,
  _order_id uuid,
  _appointment_id uuid,
  _session_number integer,
  _session_date date,
  _ciphertext text,
  _iv text,
  _auth_tag text,
  _author uuid,
  _author_email text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _id uuid := _record_id; _next integer; _ok boolean;
BEGIN
  IF _customer_id IS NOT NULL THEN
    SELECT true INTO _ok FROM public.customers WHERE id = _customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado.'; END IF;
  END IF;

  IF _order_id IS NOT NULL THEN
    SELECT true INTO _ok FROM public.orders
     WHERE id = _order_id AND (_customer_id IS NULL OR customer_id = _customer_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado para este cliente.'; END IF;
  END IF;

  IF _appointment_id IS NOT NULL THEN
    SELECT true INTO _ok FROM public.appointments
     WHERE id = _appointment_id
       AND (_customer_id IS NULL OR customer_id IS NULL OR customer_id = _customer_id)
       AND (_order_id IS NULL OR order_id IS NULL OR order_id = _order_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Agendamento não encontrado para este cliente.'; END IF;
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.clinical_records (customer_id, order_id, appointment_id, session_number, session_date, created_by)
    VALUES (_customer_id, _order_id, _appointment_id, _session_number, _session_date, _author)
    RETURNING id INTO _id;
  ELSE
    UPDATE public.clinical_records
       SET customer_id = _customer_id, order_id = _order_id, appointment_id = _appointment_id,
           session_number = _session_number, session_date = _session_date
     WHERE id = _id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro não encontrado.'; END IF;
  END IF;

  SELECT COALESCE(max(version), 0) + 1 INTO _next
    FROM public.clinical_record_versions WHERE record_id = _id;

  INSERT INTO public.clinical_record_versions (record_id, version, ciphertext, iv, auth_tag, algo, author_id)
  VALUES (_id, _next, _ciphertext, _iv, _auth_tag, 'aes-256-gcm', _author);

  INSERT INTO public.clinical_access_logs (record_id, actor_id, actor_email, action)
  VALUES (_id, _author, _author_email, CASE WHEN _record_id IS NULL THEN 'clinical.create' ELSE 'clinical.update' END);

  RETURN _id;
END $$;

-- Wrappers públicos: SECURITY DEFINER, search_path fixo, só service_role.
CREATE OR REPLACE FUNCTION public.sync_appointment_session(
  _appointment_id uuid, _scheduled timestamptz, _duration integer, _meeting text, _title text
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.sync_appointment_session(_appointment_id, _scheduled, _duration, _meeting, _title)
$$;

CREATE OR REPLACE FUNCTION public.confirm_appointment_tx(
  _appointment_id uuid, _starts timestamptz, _duration integer, _meeting text, _client_note text
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.confirm_appointment_tx(_appointment_id, _starts, _duration, _meeting, _client_note)
$$;

CREATE OR REPLACE FUNCTION public.confirm_mentorship_session_tx(
  _session_id uuid, _scheduled timestamptz, _meeting text
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.confirm_mentorship_session_tx(_session_id, _scheduled, _meeting)
$$;

CREATE OR REPLACE FUNCTION public.save_clinical_record_tx(
  _record_id uuid, _customer_id uuid, _order_id uuid, _appointment_id uuid,
  _session_number integer, _session_date date, _ciphertext text, _iv text, _auth_tag text,
  _author uuid, _author_email text
) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.save_clinical_record_tx(_record_id, _customer_id, _order_id, _appointment_id,
    _session_number, _session_date, _ciphertext, _iv, _auth_tag, _author, _author_email)
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.sync_appointment_session(uuid,timestamptz,integer,text,text)',
    'public.confirm_appointment_tx(uuid,timestamptz,integer,text,text)',
    'public.confirm_mentorship_session_tx(uuid,timestamptz,text)',
    'public.save_clinical_record_tx(uuid,uuid,uuid,uuid,integer,date,text,text,text,uuid,text)',
    'private.sync_appointment_session(uuid,timestamptz,integer,text,text)',
    'private.confirm_appointment_tx(uuid,timestamptz,integer,text,text)',
    'private.confirm_mentorship_session_tx(uuid,timestamptz,text)',
    'private.save_clinical_record_tx(uuid,uuid,uuid,uuid,integer,date,text,text,text,uuid,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'public.sync_appointment_session(uuid,timestamptz,integer,text,text)',
    'public.confirm_appointment_tx(uuid,timestamptz,integer,text,text)',
    'public.confirm_mentorship_session_tx(uuid,timestamptz,text)',
    'public.save_clinical_record_tx(uuid,uuid,uuid,uuid,integer,date,text,text,text,uuid,text)'
  ] LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;