-- Anexos clínicos cifrados: metadados adicionais
ALTER TABLE public.clinical_attachments ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'clinical-attachments';
ALTER TABLE public.clinical_attachments ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.clinical_attachments ADD COLUMN IF NOT EXISTS size_bytes integer;
ALTER TABLE public.clinical_attachments ADD COLUMN IF NOT EXISTS iv text;
ALTER TABLE public.clinical_attachments ADD COLUMN IF NOT EXISTS auth_tag text;
ALTER TABLE public.clinical_attachments ADD COLUMN IF NOT EXISTS algo text NOT NULL DEFAULT 'aes-256-gcm';
ALTER TABLE public.clinical_attachments ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Proibição de exclusão física em todo o módulo clínico (apenas arquivamento)
CREATE OR REPLACE FUNCTION private.block_hard_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','private' AS $$
BEGIN
  RAISE EXCEPTION 'Exclusão física não permitida neste módulo. Utilize arquivamento.';
END $$;
REVOKE ALL ON FUNCTION private.block_hard_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS t_clinical_records_no_delete ON public.clinical_records;
CREATE TRIGGER t_clinical_records_no_delete BEFORE DELETE ON public.clinical_records
FOR EACH ROW EXECUTE FUNCTION private.block_hard_delete();

DROP TRIGGER IF EXISTS t_clinical_versions_no_delete ON public.clinical_record_versions;
CREATE TRIGGER t_clinical_versions_no_delete BEFORE DELETE ON public.clinical_record_versions
FOR EACH ROW EXECUTE FUNCTION private.block_hard_delete();

DROP TRIGGER IF EXISTS t_clinical_attachments_no_delete ON public.clinical_attachments;
CREATE TRIGGER t_clinical_attachments_no_delete BEFORE DELETE ON public.clinical_attachments
FOR EACH ROW EXECUTE FUNCTION private.block_hard_delete();

DROP TRIGGER IF EXISTS t_clinical_access_logs_no_delete ON public.clinical_access_logs;
CREATE TRIGGER t_clinical_access_logs_no_delete BEFORE DELETE ON public.clinical_access_logs
FOR EACH ROW EXECUTE FUNCTION private.block_hard_delete();

DROP TRIGGER IF EXISTS t_clinical_attachments_updated ON public.clinical_attachments;

-- Reforço: nenhum grant para anon/authenticated no módulo clínico
REVOKE ALL ON public.clinical_records FROM anon, authenticated;
REVOKE ALL ON public.clinical_record_versions FROM anon, authenticated;
REVOKE ALL ON public.clinical_attachments FROM anon, authenticated;
REVOKE ALL ON public.clinical_access_logs FROM anon, authenticated;
GRANT ALL ON public.clinical_records TO service_role;
GRANT ALL ON public.clinical_record_versions TO service_role;
GRANT ALL ON public.clinical_attachments TO service_role;
GRANT ALL ON public.clinical_access_logs TO service_role;

-- Reforço: agenda e eventos sem acesso anônimo
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.appointment_events FROM anon;
REVOKE ALL ON public.mentorship_sessions FROM anon;
REVOKE ALL ON public.session_credits FROM anon;
REVOKE ALL ON public.service_catalog FROM anon;