// Validação estrita (Zod) de todas as entradas do módulo clínico.
// Nenhum campo extra é aceito: .strict() em todos os objetos.
import { z } from "zod";

const uuid = z.string().uuid();

/** Base64 de até ~10 MB de conteúdo binário (4/3 + padding + margem). */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_ATTACHMENT_BYTES / 3) * 4) + 1024;

export const ATTACHMENT_MAX_BYTES = MAX_ATTACHMENT_BYTES;

export const ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const ATTACHMENT_ACCEPT = ATTACHMENT_MIME_TYPES.join(",");

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((v) => {
    const parsed = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
  }, "Data inválida.");

export const readClinicalSchema = z.object({ recordId: uuid }).strict();

export const saveClinicalSchema = z
  .object({
    recordId: uuid.nullable().optional(),
    customerId: uuid.nullable(),
    orderId: uuid.nullable().optional(),
    appointmentId: uuid.nullable().optional(),
    sessionNumber: z.number().int().min(1).max(10000).nullable(),
    sessionDate: isoDate.nullable(),
    content: z.string().min(1).max(40000),
  })
  .strict();

export const archiveClinicalSchema = z.object({ recordId: uuid, archived: z.boolean() }).strict();

export const listAttachmentsSchema = z.object({ recordId: uuid }).strict();

export const uploadAttachmentSchema = z
  .object({
    recordId: uuid,
    fileName: z.string().trim().min(1).max(160),
    mimeType: z.enum(ATTACHMENT_MIME_TYPES),
    contentBase64: z
      .string()
      .min(1)
      .max(MAX_BASE64_LENGTH, "Arquivo acima de 10 MB.")
      .regex(/^[A-Za-z0-9+/=\r\n]+$/, "Conteúdo inválido."),
  })
  .strict();

export const readAttachmentSchema = z.object({ attachmentId: uuid }).strict();

export const archiveAttachmentSchema = z
  .object({ attachmentId: uuid, archived: z.boolean() })
  .strict();

export type SaveClinicalInput = z.infer<typeof saveClinicalSchema>;
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
export type ArchiveClinicalInput = z.infer<typeof archiveClinicalSchema>;
export type ArchiveAttachmentInput = z.infer<typeof archiveAttachmentSchema>;
