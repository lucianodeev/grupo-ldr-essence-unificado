
-- ROLES
CREATE TYPE public.app_role AS ENUM ('superadmin','colaborador');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_authorized(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE p.id = _user_id AND p.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE p.id = _user_id AND p.is_active = true AND r.role = 'superadmin'
  )
$$;

CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "profiles_update_self_name" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));

-- BOOTSTRAP (uso único)
CREATE TABLE public.app_bootstrap (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);
GRANT ALL ON public.app_bootstrap TO service_role;
ALTER TABLE public.app_bootstrap ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_bootstrap (id, completed) VALUES (true, false);

-- AUDIT
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_superadmin" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));
CREATE POLICY "audit_insert_authorized" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized(auth.uid()) AND actor_id = auth.uid());

-- DADOS S8
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  city text,
  birth_date date,
  business_stage text,
  business_area text,
  goal text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.s8_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  session_number smallint NOT NULL CHECK (session_number BETWEEN 1 AND 8),
  scale smallint CHECK (scale BETWEEN 0 AND 10),
  main_answers text,
  professional_notes text,
  task text,
  completed boolean NOT NULL DEFAULT false,
  session_date date,
  duration_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, session_number)
);

CREATE TABLE public.business_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL UNIQUE REFERENCES public.participants(id) ON DELETE CASCADE,
  business_name text,
  idea_pitch text,
  problem text,
  solution text,
  target_audience text,
  product_service text,
  value_proposition text,
  channels text,
  sales text,
  pricing text,
  costs text,
  revenues text,
  partners_resources text,
  risks_responses text,
  goals_indicators text,
  plan_30_60_90 text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pde_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL UNIQUE REFERENCES public.participants(id) ON DELETE CASCADE,
  strengths text,
  competencies text,
  evolution text,
  recommendations text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants, public.s8_sessions, public.business_projects, public.pde_records TO authenticated;
GRANT ALL ON public.participants, public.s8_sessions, public.business_projects, public.pde_records TO service_role;

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.s8_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pde_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_authorized" ON public.participants FOR ALL TO authenticated
  USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY "s8_sessions_authorized" ON public.s8_sessions FOR ALL TO authenticated
  USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY "business_projects_authorized" ON public.business_projects FOR ALL TO authenticated
  USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY "pde_records_authorized" ON public.pde_records FOR ALL TO authenticated
  USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_participants_updated BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_sessions_updated BEFORE UPDATE ON public.s8_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_projects_updated BEFORE UPDATE ON public.business_projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_pde_updated BEFORE UPDATE ON public.pde_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
