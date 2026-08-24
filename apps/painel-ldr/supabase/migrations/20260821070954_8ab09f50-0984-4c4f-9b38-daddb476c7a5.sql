CREATE TABLE IF NOT EXISTS public.appointment_calendar_sync (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  calendar_id text NOT NULL DEFAULT 'contacto@ldrrhestrategia.com',
  google_event_id text,
  meet_url text,
  sync_status text NOT NULL DEFAULT 'pendente',
  last_error_code text,
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_calendar_sync_status_chk'
  ) THEN
    ALTER TABLE public.appointment_calendar_sync
      ADD CONSTRAINT appointment_calendar_sync_status_chk
      CHECK (sync_status IN ('pendente','sincronizado','erro','conflito','cancelado','manual'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS appointment_calendar_sync_event_uidx
  ON public.appointment_calendar_sync (google_event_id)
  WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS appointment_calendar_sync_status_idx
  ON public.appointment_calendar_sync (sync_status);

REVOKE ALL ON public.appointment_calendar_sync FROM PUBLIC;
REVOKE ALL ON public.appointment_calendar_sync FROM anon;
REVOKE ALL ON public.appointment_calendar_sync FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_calendar_sync TO service_role;

ALTER TABLE public.appointment_calendar_sync ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS t_appointment_calendar_sync_updated ON public.appointment_calendar_sync;
CREATE TRIGGER t_appointment_calendar_sync_updated
  BEFORE UPDATE ON public.appointment_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();