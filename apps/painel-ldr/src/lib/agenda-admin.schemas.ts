import { z } from "zod";

/** Somente https e provedores de videochamada conhecidos. */
const MEETING_HOSTS = [
  "meet.google.com",
  "zoom.us",
  "teams.microsoft.com",
  "teams.live.com",
  "whereby.com",
  "meet.jit.si",
  "us02web.zoom.us",
];

export const meetingUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return MEETING_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  }, "Informe um link https de videochamada válido (Google Meet, Zoom, Teams…).");

/** Data válida e realmente futura (tolerância de 1 minuto para relógio do cliente). */
const isoFuture = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data inválida.")
  .refine((v) => new Date(v).getTime() > Date.now() - 60_000, "Informe uma data futura.");

export const confirmAppointmentSchema = z
  .object({
    appointmentId: z.string().uuid(),
    startsAt: isoFuture,
    durationMinutes: z.number().int().min(15).max(240).optional(),
    meetingUrl: meetingUrlSchema,
    clientNote: z.string().trim().max(800).optional().nullable(),
  })
  .strict();

export const appointmentStatusSchema = z
  .object({
    appointmentId: z.string().uuid(),
    status: z.enum(["agendada", "concluida", "cancelada", "reagendada"]),
    comment: z.string().trim().max(800).optional().nullable(),
  })
  .strict();

export const appointmentDetailsSchema = z
  .object({
    appointmentId: z.string().uuid(),
    startsAt: isoFuture.optional().nullable(),
    durationMinutes: z.number().int().min(15).max(240).optional(),
    clientNotes: z.string().trim().max(2000).optional().nullable(),
    internalNotes: z.string().trim().max(4000).optional().nullable(),
    clientVisible: z.boolean().optional(),
  })
  .strict();

export const createAppointmentSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    orderId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    startsAt: isoFuture.optional().nullable(),
    durationMinutes: z.number().int().min(15).max(240).default(50),
    meetingUrl: meetingUrlSchema.optional().nullable(),
    clientNotes: z.string().trim().max(2000).optional().nullable(),
    internalNotes: z.string().trim().max(4000).optional().nullable(),
    consumesCredit: z.boolean().default(true),
  })
  .strict();

export const confirmSessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    scheduledAt: isoFuture,
    meetingUrl: meetingUrlSchema,
  })
  .strict();

export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>;
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>;
export type AppointmentDetailsInput = z.infer<typeof appointmentDetailsSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type ConfirmSessionInput = z.infer<typeof confirmSessionSchema>;

/** Vínculo de pedido pago em agendamento legado: só ids, nada derivável do cliente. */
export const linkPaidOrderSchema = z
  .object({
    appointmentId: z.string().uuid(),
    orderId: z.string().uuid(),
  })
  .strict();

export type LinkPaidOrderInput = z.infer<typeof linkPaidOrderSchema>;
