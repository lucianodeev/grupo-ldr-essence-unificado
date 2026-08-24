REVOKE ALL ON FUNCTION public.audit_event(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_order_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_delivery_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_mentorship_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_event(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.track_order_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.track_delivery_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.track_mentorship_changes() TO service_role;