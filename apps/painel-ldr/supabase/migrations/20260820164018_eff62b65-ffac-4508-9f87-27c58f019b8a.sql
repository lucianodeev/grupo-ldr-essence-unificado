CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_authorized(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.id
  WHERE p.id = _user_id AND p.is_active = true) $$;

CREATE OR REPLACE FUNCTION private.is_superadmin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.id
  WHERE p.id = _user_id AND p.is_active = true AND r.role = 'superadmin') $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_authorized(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_superadmin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_authorized(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_superadmin(uuid) TO authenticated, service_role;

-- Repoint policies to the private helpers
DROP POLICY IF EXISTS audit_insert_authorized ON public.audit_logs;
CREATE POLICY audit_insert_authorized ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (private.is_authorized(auth.uid()) AND actor_id = auth.uid());
DROP POLICY IF EXISTS audit_select_superadmin ON public.audit_logs;
CREATE POLICY audit_select_superadmin ON public.audit_logs FOR SELECT TO authenticated
  USING (private.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS order_history_insert ON public.order_history;
CREATE POLICY order_history_insert ON public.order_history FOR INSERT TO authenticated
  WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS order_history_select ON public.order_history;
CREATE POLICY order_history_select ON public.order_history FOR SELECT TO authenticated
  USING (private.is_authorized(auth.uid()));

DROP POLICY IF EXISTS customers_authorized ON public.customers;
CREATE POLICY customers_authorized ON public.customers FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS orders_authorized ON public.orders;
CREATE POLICY orders_authorized ON public.orders FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS mentorships_authorized ON public.mentorships;
CREATE POLICY mentorships_authorized ON public.mentorships FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS deliveries_authorized ON public.deliveries;
CREATE POLICY deliveries_authorized ON public.deliveries FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS participants_authorized ON public.participants;
CREATE POLICY participants_authorized ON public.participants FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS s8_sessions_authorized ON public.s8_sessions;
CREATE POLICY s8_sessions_authorized ON public.s8_sessions FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS business_projects_authorized ON public.business_projects;
CREATE POLICY business_projects_authorized ON public.business_projects FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));
DROP POLICY IF EXISTS pde_records_authorized ON public.pde_records;
CREATE POLICY pde_records_authorized ON public.pde_records FOR ALL TO authenticated
  USING (private.is_authorized(auth.uid())) WITH CHECK (private.is_authorized(auth.uid()));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_authorized(uuid);
DROP FUNCTION IF EXISTS public.is_superadmin(uuid);