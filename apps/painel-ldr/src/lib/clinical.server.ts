// Server-only: prontuário de Psicanálise.
// Conteúdo clínico é cifrado na aplicação (AES-256-GCM) antes de tocar o banco.
// Nenhuma tabela clinical_* tem grants para anon/authenticated: só service_role.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { resolveAccess } from "@/lib/access.server";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
  archiveAttachmentSchema,
  archiveClinicalSchema,
  listAttachmentsSchema,
  readAttachmentSchema,
  readClinicalSchema,
  saveClinicalSchema,
  uploadAttachmentSchema,
} from "@/lib/clinical.schemas";

type Client = SupabaseClient<Database>;

function fail(message: string): never {
  throw new Error(message);
}

/** Chave server-only. Fail-closed: sem segredo, o módulo não abre. */
function key(): Buffer {
  const raw = process.env["CLINICAL_RECORDS_KEY"];
  if (!raw || raw.length < 32) fail("Módulo clínico indisponível.");
  return createHash("sha256").update(raw).digest();
}

export function clinicalKeyConfigured(): boolean {
  const raw = process.env["CLINICAL_RECORDS_KEY"];
  return Boolean(raw && raw.length >= 32);
}

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    auth_tag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(row: { ciphertext: string; iv: string; auth_tag: string }): string {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(row.iv, "base64"));
    decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(row.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

async function requireOwner(supabase: Client, userId: string) {
  const access = await resolveAccess(supabase, userId);
  if (!access.authorized || access.role !== "superadmin") fail("Acesso negado.");
  return access;
}

async function logAccess(
  recordId: string | null,
  actorId: string,
  actorEmail: string | null,
  action: string,
) {
  await supabaseAdmin.from("clinical_access_logs").insert({
    record_id: recordId,
    actor_id: actorId,
    actor_email: actorEmail,
    action,
  });
}

export type ClinicalRecordSummary = {
  id: string;
  customerId: string | null;
  customerName: string | null;
  sessionNumber: number | null;
  sessionDate: string | null;
  archived: boolean;
  updatedAt: string;
  versions: number;
};

export async function listClinicalRecords(supabase: Client, userId: string) {
  const access = await requireOwner(supabase, userId);
  if (!clinicalKeyConfigured()) return { available: false as const, records: [] };

  const { data } = await supabaseAdmin
    .from("clinical_records")
    .select("id, customer_id, session_number, session_date, archived, updated_at, customers(full_name), clinical_record_versions(id)")
    .order("session_date", { ascending: false, nullsFirst: false });

  await logAccess(null, userId, access.email, "clinical.list");

  const records: ClinicalRecordSummary[] = (data ?? []).map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: (r.customers as { full_name: string } | null)?.full_name ?? null,
    sessionNumber: r.session_number,
    sessionDate: r.session_date,
    archived: r.archived,
    updatedAt: r.updated_at,
    versions: (r.clinical_record_versions as { id: string }[] | null)?.length ?? 0,
  }));

  return { available: true as const, records };
}

export async function readClinicalRecord(supabase: Client, userId: string, raw: unknown) {
  const access = await requireOwner(supabase, userId);
  const { recordId } = readClinicalSchema.parse(raw);
  if (!clinicalKeyConfigured()) fail("Módulo clínico indisponível.");

  const { data: record } = await supabaseAdmin
    .from("clinical_records")
    .select("id, customer_id, session_number, session_date, archived, created_at, updated_at")
    .eq("id", recordId)
    .maybeSingle();
  if (!record) fail("Registro não encontrado.");

  const { data: versions } = await supabaseAdmin
    .from("clinical_record_versions")
    .select("id, version, ciphertext, iv, auth_tag, created_at")
    .eq("record_id", recordId)
    .order("version", { ascending: false });

  await logAccess(recordId, userId, access.email, "clinical.read");

  return {
    record: {
      id: record.id,
      customerId: record.customer_id,
      sessionNumber: record.session_number,
      sessionDate: record.session_date,
      archived: record.archived,
      updatedAt: record.updated_at,
    },
    versions: (versions ?? []).map((v) => ({
      id: v.id,
      version: v.version,
      createdAt: v.created_at,
      content: decrypt(v),
    })),
  };
}

export async function saveClinicalRecord(supabase: Client, userId: string, raw: unknown) {
  const access = await requireOwner(supabase, userId);
  const input = saveClinicalSchema.parse(raw);
  if (!clinicalKeyConfigured()) fail("Módulo clínico indisponível.");

  // Cabeçalho + nova versão cifrada + trilha numa única transação no banco.
  // A checagem de existência/coerência de cliente, pedido e agendamento
  // acontece dentro da mesma transação: em erro, nada é gravado.
  const payload = encrypt(input.content);
  // Os vínculos são opcionais no banco (nullable); os tipos gerados não o refletem.
  const args = {
    _record_id: input.recordId ?? null,
    _customer_id: input.customerId,
    _order_id: input.orderId ?? null,
    _appointment_id: input.appointmentId ?? null,
    _session_number: input.sessionNumber,
    _session_date: input.sessionDate,
    _ciphertext: payload.ciphertext,
    _iv: payload.iv,
    _auth_tag: payload.auth_tag,
    _author: userId,
    _author_email: access.email,
  } as unknown as Database["public"]["Functions"]["save_clinical_record_tx"]["Args"];

  const { data: savedId, error } = await supabaseAdmin.rpc("save_clinical_record_tx", args);

  if (error || !savedId) {
    // Mensagens genéricas: nenhum conteúdo clínico é registrado ou devolvido.
    const message = error?.message ?? "";
    if (message.includes("Cliente não encontrado")) fail("Cliente não encontrado.");
    if (message.includes("Pedido não encontrado")) fail("Pedido não encontrado para este cliente.");
    if (message.includes("Agendamento não encontrado")) {
      fail("Agendamento não encontrado para este cliente.");
    }
    if (message.includes("Registro não encontrado")) fail("Registro não encontrado.");
    fail("Não foi possível salvar o registro.");
  }

  return { ok: true as const, recordId: savedId };
}


/** Sem exclusão física: apenas arquivamento com trilha. */
export async function archiveClinicalRecord(supabase: Client, userId: string, raw: unknown) {
  const access = await requireOwner(supabase, userId);
  const input = archiveClinicalSchema.parse(raw);
  const { data: exists } = await supabaseAdmin
    .from("clinical_records")
    .select("id")
    .eq("id", input.recordId)
    .maybeSingle();
  if (!exists) fail("Registro não encontrado.");
  await supabaseAdmin
    .from("clinical_records")
    .update({ archived: input.archived })
    .eq("id", input.recordId);
  await logAccess(input.recordId, userId, access.email, input.archived ? "clinical.archive" : "clinical.restore");
  return { ok: true as const };
}

export async function clinicalAccessTrail(supabase: Client, userId: string) {
  await requireOwner(supabase, userId);
  const { data } = await supabaseAdmin
    .from("clinical_access_logs")
    .select("id, record_id, actor_email, action, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// ------------------------------------------------- anexos cifrados

const BUCKET = "clinical-attachments";
const MAX_ATTACHMENT_BYTES = ATTACHMENT_MAX_BYTES;
const ALLOWED_MIME = new Set<string>(ATTACHMENT_MIME_TYPES);

export type ClinicalAttachment = {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  archived: boolean;
  createdAt: string;
};

export async function listClinicalAttachments(
  supabase: Client,
  userId: string,
  raw: unknown,
): Promise<ClinicalAttachment[]> {
  await requireOwner(supabase, userId);
  const { recordId } = listAttachmentsSchema.parse(raw);
  const { data } = await supabaseAdmin
    .from("clinical_attachments")
    .select("id, file_name, mime_type, size_bytes, archived, created_at")
    .eq("record_id", recordId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((a) => ({
    id: a.id,
    fileName: a.file_name,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    archived: a.archived,
    createdAt: a.created_at,
  }));
}

/**
 * Upload de anexo: o arquivo é cifrado (AES-256-GCM) na aplicação e só então
 * gravado num bucket privado sem policies — nem o navegador nem o Data API
 * conseguem ler o objeto. Recebe o conteúdo em base64.
 */
export async function uploadClinicalAttachment(supabase: Client, userId: string, raw: unknown) {
  const access = await requireOwner(supabase, userId);
  const input = uploadAttachmentSchema.parse(raw);
  if (!clinicalKeyConfigured()) fail("Módulo clínico indisponível.");
  if (!ALLOWED_MIME.has(input.mimeType)) fail("Tipo de arquivo não permitido.");

  const bytes = Buffer.from(input.contentBase64, "base64");
  if (!bytes.length) fail("Arquivo vazio.");
  if (bytes.length > MAX_ATTACHMENT_BYTES) fail("Arquivo acima de 10 MB.");

  const { data: record } = await supabaseAdmin
    .from("clinical_records")
    .select("id")
    .eq("id", input.recordId)
    .maybeSingle();
  if (!record) fail("Registro não encontrado.");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const payload = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const safeName = input.fileName.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "anexo";
  const path = `${input.recordId}/${randomBytes(12).toString("hex")}.enc`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, payload, { contentType: "application/octet-stream", upsert: false });
  if (error) fail("Não foi possível salvar o anexo.");

  const { error: metaError } = await supabaseAdmin.from("clinical_attachments").insert({
    record_id: input.recordId,
    storage_path: path,
    bucket: BUCKET,
    file_name: safeName,
    mime_type: input.mimeType,
    size_bytes: bytes.length,
    iv: iv.toString("base64"),
    auth_tag: authTag.toString("base64"),
    algo: "aes-256-gcm",
    uploaded_by: userId,
  });

  if (metaError) {
    // Rollback restrito ao objeto recém-criado: nada existente é tocado.
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    fail("Não foi possível salvar o anexo.");
  }

  await logAccess(input.recordId, userId, access.email, "clinical.attachment_uploaded");
  return { ok: true as const };
}

/** Download decifrado na memória do servidor; devolve base64 ao dono do módulo. */
export async function readClinicalAttachment(supabase: Client, userId: string, raw: unknown) {
  const access = await requireOwner(supabase, userId);
  const { attachmentId } = readAttachmentSchema.parse(raw);
  if (!clinicalKeyConfigured()) fail("Módulo clínico indisponível.");

  const { data: att } = await supabaseAdmin
    .from("clinical_attachments")
    .select("id, record_id, storage_path, bucket, file_name, mime_type, iv, auth_tag, archived")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!att || att.archived) fail("Anexo indisponível.");
  if (!att.iv || !att.auth_tag) fail("Anexo indisponível.");

  const { data: blob, error } = await supabaseAdmin.storage
    .from(att.bucket || BUCKET)
    .download(att.storage_path);
  if (error || !blob) fail("Anexo indisponível.");

  const encrypted = Buffer.from(await blob.arrayBuffer());
  let plain: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(att.iv, "base64"));
    decipher.setAuthTag(Buffer.from(att.auth_tag, "base64"));
    plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    fail("Anexo indisponível.");
  }

  await logAccess(att.record_id, userId, access.email, "clinical.attachment_read");

  return {
    fileName: att.file_name,
    mimeType: att.mime_type ?? "application/octet-stream",
    contentBase64: plain.toString("base64"),
  };
}

/** Anexos também não são apagados: apenas arquivados, com trilha. */
export async function archiveClinicalAttachment(supabase: Client, userId: string, raw: unknown) {
  const access = await requireOwner(supabase, userId);
  const input = archiveAttachmentSchema.parse(raw);
  const { data: att } = await supabaseAdmin
    .from("clinical_attachments")
    .select("id, record_id")
    .eq("id", input.attachmentId)
    .maybeSingle();
  if (!att) fail("Anexo indisponível.");

  await supabaseAdmin
    .from("clinical_attachments")
    .update({ archived: input.archived, archived_at: input.archived ? new Date().toISOString() : null })
    .eq("id", input.attachmentId);

  await logAccess(
    att.record_id,
    userId,
    access.email,
    input.archived ? "clinical.attachment_archived" : "clinical.attachment_restored",
  );
  return { ok: true as const };
}
