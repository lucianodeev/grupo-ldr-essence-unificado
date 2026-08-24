
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE ALL ON FUNCTION public.is_authorized(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.is_superadmin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_authorized(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, service_role;
