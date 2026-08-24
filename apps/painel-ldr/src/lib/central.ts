// Rótulos e utilitários compartilhados da Central de Operação.
import type { Database } from "@/integrations/supabase/types";

export type ServiceType = Database["public"]["Enums"]["service_type"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PriorityLevel = Database["public"]["Enums"]["priority_level"];
export type MentorshipStatus = Database["public"]["Enums"]["mentorship_status"];
export type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

export type Tone = "neutral" | "info" | "gold" | "success" | "danger";

export const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "recrutamento_selecao", label: "Recrutamento e seleção" },
  { value: "site", label: "Criação/desenvolvimento de site" },
  { value: "mentoria", label: "Mentoria para empreendedorismo" },
  { value: "produto_digital", label: "Produtos/treinamentos digitais" },
  { value: "palestra", label: "Palestras/serviços profissionais" },
  { value: "outros", label: "Outros serviços" },
];

export const ORDER_STATUSES: { value: OrderStatus; label: string; tone: Tone }[] = [
  { value: "novo", label: "Novo", tone: "info" },
  { value: "em_analise", label: "Em análise", tone: "gold" },
  { value: "em_andamento", label: "Em andamento", tone: "gold" },
  { value: "aguardando_cliente", label: "Aguardando cliente", tone: "neutral" },
  { value: "em_revisao", label: "Em revisão", tone: "gold" },
  { value: "concluido", label: "Concluído", tone: "success" },
  { value: "cancelado", label: "Cancelado", tone: "danger" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; tone: Tone }[] = [
  { value: "pendente", label: "Pagamento pendente", tone: "neutral" },
  { value: "pago", label: "Pago", tone: "success" },
  { value: "reembolsado", label: "Reembolsado", tone: "gold" },
  { value: "falhou", label: "Falhou", tone: "danger" },
];

export const PRIORITIES: { value: PriorityLevel; label: string; tone: Tone }[] = [
  { value: "baixa", label: "Baixa", tone: "neutral" },
  { value: "media", label: "Média", tone: "info" },
  { value: "alta", label: "Alta", tone: "gold" },
  { value: "urgente", label: "Urgente", tone: "danger" },
];

export const MENTORSHIP_STATUSES: { value: MentorshipStatus; label: string; tone: Tone }[] = [
  { value: "intake", label: "Formulário inicial", tone: "info" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento", tone: "neutral" },
  { value: "aguardando_agendamento", label: "Aguardando agendamento", tone: "gold" },
  { value: "agendada", label: "Agendada", tone: "gold" },
  { value: "em_andamento", label: "Em andamento", tone: "info" },
  { value: "concluida", label: "Concluída", tone: "success" },
  { value: "cancelada", label: "Cancelada", tone: "danger" },
];

export const DELIVERY_STATUSES: { value: DeliveryStatus; label: string; tone: Tone }[] = [
  { value: "pendente", label: "Pendente", tone: "neutral" },
  { value: "em_producao", label: "Em produção", tone: "gold" },
  { value: "em_revisao", label: "Em revisão", tone: "info" },
  { value: "entregue", label: "Entregue", tone: "success" },
  { value: "ajustes_solicitados", label: "Ajustes solicitados", tone: "gold" },
  { value: "aprovada", label: "Aprovada pelo cliente", tone: "success" },
  { value: "cancelada", label: "Cancelada", tone: "danger" },
];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "novo",
  "em_analise",
  "em_andamento",
  "aguardando_cliente",
  "em_revisao",
];

export function labelOf<T extends string>(
  list: { value: T; label: string }[],
  value: T | null | undefined,
): string {
  return list.find((i) => i.value === value)?.label ?? "—";
}

export function toneOf<T extends string>(
  list: { value: T; label: string; tone: Tone }[],
  value: T | null | undefined,
): Tone {
  return list.find((i) => i.value === value)?.tone ?? "neutral";
}

export function formatMoney(cents: number | null | undefined, currency = "BRL"): string {
  if (cents === null || cents === undefined) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Converte um valor de datetime-local em ISO, e vice-versa. */
export function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type SessionStatus = Database["public"]["Enums"]["session_status"];

export const SESSION_STATUSES: { value: SessionStatus; label: string; tone: Tone }[] = [
  { value: "agendada", label: "Agendada", tone: "info" },
  { value: "concluida", label: "Concluída", tone: "success" },
  { value: "cancelada", label: "Cancelada", tone: "danger" },
  { value: "reagendada", label: "Reagendada", tone: "gold" },
];

export const DELIVERY_EVENT_LABELS: Record<string, string> = {
  entregue: "Entrega disponibilizada",
  aprovada: "Aprovada pelo cliente",
  ajuste_solicitado: "Ajuste solicitado",
  comentario: "Comentário",
  revisada: "Nova versão enviada",
};

/** Aceita apenas links http(s) — usado nos botões de videochamada. */
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
