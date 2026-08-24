-- Aditiva e idempotente: lease/CAS para a sincronização Google Calendar.
ALTER TABLE public.appointment_calendar_sync
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_calendar_sync_lease
  ON public.appointment_calendar_sync (lease_expires_at)
  WHERE lease_expires_at IS NOT NULL;

-- Claim atômico: só um chamador ativo por appointment_id.
CREATE OR REPLACE FUNCTION private.claim_calendar_sync(
  _appointment_id uuid,
  _calendar_id text,
  _lease_seconds integer
)
RETURNS TABLE (
  claimed boolean,
  lease_token uuid,
  google_event_id text,
  meet_url text,
  sync_status text,
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  _tok uuid := gen_random_uuid();
  _row public.appointment_calendar_sync;
BEGIN
  INSERT INTO public.appointment_calendar_sync AS s (
    appointment_id, calendar_id, sync_status, attempts, last_attempt_at,
    lease_token, lease_expires_at
  )
  VALUES (
    _appointment_id, _calendar_id, 'pendente', 1, now(),
    _tok, now() + make_interval(secs => GREATEST(_lease_seconds, 10))
  )
  ON CONFLICT (appointment_id) DO UPDATE
    SET attempts = s.attempts + 1,
        last_attempt_at = now(),
        last_error_code = NULL,
        lease_token = _tok,
        lease_expires_at = now() + make_interval(secs => GREATEST(_lease_seconds, 10))
    WHERE s.lease_expires_at IS NULL OR s.lease_expires_at < now()
  RETURNING s.* INTO _row;

  IF _row.appointment_id IS NULL THEN
    SELECT * INTO _row FROM public.appointment_calendar_sync
     WHERE appointment_calendar_sync.appointment_id = _appointment_id;
    RETURN QUERY SELECT false, NULL::uuid, _row.google_event_id, _row.meet_url,
                        _row.sync_status, _row.attempts;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, _row.lease_token, _row.google_event_id, _row.meet_url,
                      _row.sync_status, _row.attempts;
END $$;

-- Libera o lease gravando o estado final (só o dono do token consegue).
CREATE OR REPLACE FUNCTION private.release_calendar_sync(
  _appointment_id uuid,
  _token uuid,
  _status text,
  _event_id text,
  _meet_url text,
  _error_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.appointment_calendar_sync s
     SET sync_status = COALESCE(_status, s.sync_status),
         google_event_id = COALESCE(_event_id, s.google_event_id),
         meet_url = _meet_url,
         last_error_code = _error_code,
         lease_token = NULL,
         lease_expires_at = NULL
   WHERE s.appointment_id = _appointment_id
     AND (s.lease_token = _token OR _token IS NULL);
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END $$;

CREATE OR REPLACE FUNCTION public.claim_calendar_sync(
  _appointment_id uuid,
  _calendar_id text,
  _lease_seconds integer
)
RETURNS TABLE (
  claimed boolean,
  lease_token uuid,
  google_event_id text,
  meet_url text,
  sync_status text,
  attempts integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT * FROM private.claim_calendar_sync(_appointment_id, _calendar_id, _lease_seconds)
$$;

CREATE OR REPLACE FUNCTION public.release_calendar_sync(
  _appointment_id uuid,
  _token uuid,
  _status text,
  _event_id text,
  _meet_url text,
  _error_code text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.release_calendar_sync(_appointment_id, _token, _status, _event_id, _meet_url, _error_code)
$$;

-- Menor privilégio nas novas funções.
REVOKE ALL ON FUNCTION private.claim_calendar_sync(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.release_calendar_sync(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_calendar_sync(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_calendar_sync(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_calendar_sync(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_calendar_sync(uuid, uuid, text, text, text, text) TO service_role;

-- Backfill aditivo dos links legados válidos como fallback manual auditado.
INSERT INTO public.appointment_calendar_sync (appointment_id, calendar_id, sync_status)
SELECT a.id, 'contacto@ldrrhestrategia.com', 'manual'
  FROM public.appointments a
 WHERE a.status = 'confirmada'
   AND a.meeting_url IS NOT NULL
ON CONFLICT (appointment_id) DO NOTHING;

-- Menor privilégio na tabela: nada de TRUNCATE/TRIGGER/REFERENCES.
ALTER TABLE public.appointment_calendar_sync ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.appointment_calendar_sync FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appointment_calendar_sync TO service_role;