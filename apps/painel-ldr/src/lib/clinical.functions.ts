import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  archiveAttachmentSchema,
  archiveClinicalSchema,
  listAttachmentsSchema,
  readAttachmentSchema,
  readClinicalSchema,
  saveClinicalSchema,
  uploadAttachmentSchema,
} from "@/lib/clinical.schemas";

export const listClinical = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listClinicalRecords } = await import("@/lib/clinical.server");
    return listClinicalRecords(context.supabase, context.userId);
  });

export const readClinical = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(readClinicalSchema)
  .handler(async ({ context, data }) => {
    const { readClinicalRecord } = await import("@/lib/clinical.server");
    return readClinicalRecord(context.supabase, context.userId, data);
  });

export const saveClinical = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(saveClinicalSchema)
  .handler(async ({ context, data }) => {
    const { saveClinicalRecord } = await import("@/lib/clinical.server");
    return saveClinicalRecord(context.supabase, context.userId, data);
  });

export const archiveClinical = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(archiveClinicalSchema)
  .handler(async ({ context, data }) => {
    const { archiveClinicalRecord } = await import("@/lib/clinical.server");
    return archiveClinicalRecord(context.supabase, context.userId, data);
  });

export const clinicalTrail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { clinicalAccessTrail } = await import("@/lib/clinical.server");
    return clinicalAccessTrail(context.supabase, context.userId);
  });

export const listClinicalAttachmentsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(listAttachmentsSchema)
  .handler(async ({ context, data }) => {
    const { listClinicalAttachments } = await import("@/lib/clinical.server");
    return listClinicalAttachments(context.supabase, context.userId, data);
  });

export const uploadClinicalAttachmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(uploadAttachmentSchema)
  .handler(async ({ context, data }) => {
    const { uploadClinicalAttachment } = await import("@/lib/clinical.server");
    return uploadClinicalAttachment(context.supabase, context.userId, data);
  });

export const readClinicalAttachmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(readAttachmentSchema)
  .handler(async ({ context, data }) => {
    const { readClinicalAttachment } = await import("@/lib/clinical.server");
    return readClinicalAttachment(context.supabase, context.userId, data);
  });

export const archiveClinicalAttachmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(archiveAttachmentSchema)
  .handler(async ({ context, data }) => {
    const { archiveClinicalAttachment } = await import("@/lib/clinical.server");
    return archiveClinicalAttachment(context.supabase, context.userId, data);
  });
