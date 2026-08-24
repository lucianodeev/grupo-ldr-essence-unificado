-- Aditivo e idempotente: vínculo seguro entre agenda e Sistema S8.

ALTER TABLE public.s8_sessions
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_url text;

CREATE UNIQUE INDEX IF NOT EXISTS s8_sessions_appointment_key
  ON public.s8_sessions (appointment_id) WHERE appointment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mentorship_sessions_number_key
  ON public.mentorship_sessions (mentorship_id, session_number) WHERE session_number IS NOT NULL;

CREATE OR REPLACE FUNCTION private.sync_appointment_session(
  _appointment_id uuid,
  _scheduled timestamptz,
  _duration integer,
  _meeting text,
  _title text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $fn$
DECLARE
  _appt public.appointments%ROWTYPE;
  _mentorship public.mentorships%ROWTYPE;
  _granted integer := 0;
  _session_id uuid;
  _number integer;
BEGIN
  SELECT * INTO _appt FROM public.appointments WHERE id = _appointment_id;
  IF NOT FOUND OR _appt.order_id IS NULL THEN
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
    UPDATE public.mentorship_sessions
       SET scheduled_at = _scheduled,
           duration_minutes = COALESCE(_duration, duration_minutes),
           meeting_url = _meeting,
           status = 'agendada',
           confirmed_at = now()
     WHERE id = _session_id;
  ELSE
    SELECT COALESCE(max(session_number), 0) + 1 INTO _number
      FROM public.mentorship_sessions WHERE mentorship_id = _mentorship.id;

    IF _granted > 0 AND _number > _granted THEN
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
END $fn$;

CREATE OR REPLACE FUNCTION public.sync_appointment_session(
  _appointment_id uuid,
  _scheduled timestamptz,
  _duration integer,
  _meeting text,
  _title text
) RETURNS jsonb
LANGUAGE sql
SET search_path TO 'public', 'private'
AS $w$ SELECT private.sync_appointment_session(_appointment_id, _scheduled, _duration, _meeting, _title) $w$;

REVOKE ALL ON FUNCTION private.sync_appointment_session(uuid, timestamptz, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_appointment_session(uuid, timestamptz, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_appointment_session(uuid, timestamptz, integer, text, text) TO service_role;

REVOKE ALL ON TABLE public.s8_sessions FROM anon;