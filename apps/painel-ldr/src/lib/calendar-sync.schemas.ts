import { z } from "zod";

/** Entradas das ações Google Calendar. Nada além destes campos é aceito. */

const isoFuture = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data inválida.")
  .refine((v) => new Date(v).getTime() > Date.now() - 60_000, "Informe uma data futura.");

export const confirmWithMeetSchema = z
  .object({
    appointmentId: z.string().uuid(),
    startsAt: isoFuture,
    durationMinutes: z.number().int().min(15).max(240).optional(),
    clientNote: z.string().trim().max(800).optional().nullable(),
  })
  .strict();

export const calendarSyncSchema = z
  .object({ appointmentId: z.string().uuid() })
  .strict();

export type ConfirmWithMeetInput = z.infer<typeof confirmWithMeetSchema>;
