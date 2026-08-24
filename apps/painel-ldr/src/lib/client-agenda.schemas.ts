// Validação (Zod) das ações de agenda do cliente.
// Nunca aceitamos customer_id, user_id, e-mail ou meeting_url vindos do cliente:
// a identidade e a propriedade dos dados são derivadas no servidor.
import { z } from "zod";

export const scheduleRequestSchema = z
  .object({
    orderId: z.string().uuid(),
    startsAt: z.string().min(4).max(40),
    note: z.string().max(800).nullable().optional(),
  })
  .strict();

export const rescheduleRequestSchema = z
  .object({
    appointmentId: z.string().uuid(),
    startsAt: z.string().min(4).max(40),
    note: z.string().max(800).nullable().optional(),
  })
  .strict();

export type ScheduleRequestInput = z.infer<typeof scheduleRequestSchema>;
export type RescheduleRequestInput = z.infer<typeof rescheduleRequestSchema>;

export function parseScheduleRequest(data: unknown): ScheduleRequestInput {
  const parsed = scheduleRequestSchema.safeParse(data);
  if (!parsed.success) throw new Error("Dados de agendamento inválidos.");
  return parsed.data;
}

export function parseRescheduleRequest(data: unknown): RescheduleRequestInput {
  const parsed = rescheduleRequestSchema.safeParse(data);
  if (!parsed.success) throw new Error("Dados de reagendamento inválidos.");
  return parsed.data;
}
