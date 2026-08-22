-- Aditiva e idempotente: fila/estado de sincronização Google Calendar.
CREATE INDEX IF NOT EXISTS ix_appointment_calendar_sync_status
  ON public.appointment_calendar_sync (sync_status);

CREATE INDEX IF NOT EXISTS ix_appointment_calendar_sync_event
  ON public.appointment_calendar_sync (google_event_id)
  WHERE google_event_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointment_calendar_sync_status_chk'
      AND conrelid = 'public.appointment_calendar_sync'::regclass
  ) THEN
    ALTER TABLE public.appointment_calendar_sync
      ADD CONSTRAINT appointment_calendar_sync_status_chk
      CHECK (sync_status IN ('pendente','sincronizado','erro','conflito','cancelado','manual'));
  END IF;
END $$;

-- Menor privilégio: nenhum acesso direto de anon/authenticated; só backend.
ALTER TABLE public.appointment_calendar_sync ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_calendar_sync FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.appointment_calendar_sync TO service_role;