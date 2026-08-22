CREATE OR REPLACE FUNCTION private.release_calendar_sync(
  _appointment_id uuid,
  _token uuid,
  _status text,
  _event_id text,
  _meet_url text,
  _error_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'private'
AS $fn$
DECLARE _n integer;
BEGIN
  IF _token IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.appointment_calendar_sync s
     SET sync_status = COALESCE(_status, s.sync_status),
         google_event_id = COALESCE(_event_id, s.google_event_id),
         meet_url = _meet_url,
         last_error_code = _error_code,
         lease_token = NULL,
         lease_expires_at = NULL
   WHERE s.appointment_id = _appointment_id
     AND s.lease_token IS NOT NULL
     AND s.lease_token = _token;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END
$fn$;

REVOKE ALL ON FUNCTION private.release_calendar_sync(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.release_calendar_sync(
  _appointment_id uuid,
  _token uuid,
  _status text,
  _event_id text,
  _meet_url text,
  _error_code text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public', 'private'
AS $fn$
  SELECT private.release_calendar_sync(_appointment_id, _token, _status, _event_id, _meet_url, _error_code)
$fn$;

REVOKE ALL ON FUNCTION public.release_calendar_sync(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_calendar_sync(uuid, uuid, text, text, text, text) TO service_role;