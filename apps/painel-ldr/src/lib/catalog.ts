// Helpers do catálogo interno de serviços e da agenda (client-safe).
import type { Database } from "@/integrations/supabase/types";
import type { Tone } from "@/lib/central";

export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string; tone: Tone }[] = [
  { value: "solicitada", label: "Solicitada", tone: "neutral" },
  { value: "agendada", label: "Agendada", tone: "info" },
  { value: "confirmada", label: "Confirmada", tone: "gold" },
  { value: "concluida", label: "Concluída", tone: "success" },
  { value: "reagendada", label: "Reagendada", tone: "gold" },
  { value: "cancelada", label: "Cancelada", tone: "danger" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  psicanalise: "Psicanálise",
  mentoria: "Mentoria",
  ads: "Anúncios",
  social: "Redes sociais",
  manutencao: "Manutenção de site",
  consultoria: "Consultoria",
  conteudo: "Conteúdo",
  design: "Design",
  site: "Sites e lojas",
  outros: "Outros",
};

export const BILLING_MODEL_LABELS: Record<string, string> = {
  single_paid_session: "1 sessão por pagamento",
  package_sessions: "Pacote de sessões",
  project: "Projeto/serviço",
};

/** Estados que ocupam um crédito de sessão (cancelada nunca ocupa). */
export function consumesSlot(status: AppointmentStatus): boolean {
  return status !== "cancelada";
}

export type CreditSummary = { granted: number; used: number; remaining: number };

export function creditSummary(
  granted: number,
  appointments: { status: AppointmentStatus; consumes_credit: boolean }[],
): CreditSummary {
  const used = appointments.filter((a) => a.consumes_credit && consumesSlot(a.status)).length;
  return { granted, used, remaining: Math.max(granted - used, 0) };
}
