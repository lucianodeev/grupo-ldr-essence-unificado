REVOKE ALL ON FUNCTION public.sync_appointment_session(uuid, timestamptz, integer, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_appointment_session(uuid, timestamptz, integer, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_appointment_session(uuid, timestamptz, integer, text, text) TO service_role;