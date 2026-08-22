-- Defesa em profundidade: nega explicitamente anon/authenticated em objetos do bucket clínico.
-- RESTRICTIVE: não concede nada; apenas restringe. service_role ignora RLS e segue como único caminho.
DROP POLICY IF EXISTS "clinical_attachments_deny_direct_access" ON storage.objects;

CREATE POLICY "clinical_attachments_deny_direct_access"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (bucket_id <> 'clinical-attachments')
  WITH CHECK (bucket_id <> 'clinical-attachments');