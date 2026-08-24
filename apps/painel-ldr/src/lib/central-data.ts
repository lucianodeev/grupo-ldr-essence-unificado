import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getMyAccess, listTeam } from "@/lib/access.functions";

export type Customer = Tables<"customers">;
export type Order = Tables<"orders">;
export type OrderHistory = Tables<"order_history">;
export type Mentorship = Tables<"mentorships">;
export type Delivery = Tables<"deliveries">;
export type Participant = Tables<"participants">;

function guard<T>(data: T | null, error: { message: string } | null, message: string): T {
  if (error) throw new Error(message);
  return (data ?? []) as T;
}

export function useAccess() {
  const fetchAccess = useServerFn(getMyAccess);
  return useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess({}),
    staleTime: 60_000,
  });
}

export function useTeam() {
  const fetchTeam = useServerFn(listTeam);
  return useQuery({
    queryKey: ["team"],
    queryFn: () => fetchTeam({}),
    staleTime: 30_000,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("full_name", { ascending: true });
      return guard<Customer[]>(data, error, "Não foi possível carregar os clientes.");
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return guard<Order[]>(data, error, "Não foi possível carregar os pedidos.");
    },
  });
}

export function useMentorships() {
  return useQuery({
    queryKey: ["mentorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("*")
        .order("created_at", { ascending: false });
      return guard<Mentorship[]>(data, error, "Não foi possível carregar as mentorias.");
    },
  });
}

export function useDeliveries() {
  return useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .order("created_at", { ascending: false });
      return guard<Delivery[]>(data, error, "Não foi possível carregar as entregas.");
    },
  });
}

export function useParticipants() {
  return useQuery({
    queryKey: ["participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .order("full_name", { ascending: true });
      return guard<Participant[]>(data, error, "Não foi possível carregar os participantes.");
    },
  });
}

export function useOrderHistory(orderId: string | null) {
  return useQuery({
    queryKey: ["order-history", orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_history")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      return guard<OrderHistory[]>(data, error, "Não foi possível carregar o histórico.");
    },
  });
}

export function useRecentActivity(limit = 12) {
  return useQuery({
    queryKey: ["recent-activity", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return guard<OrderHistory[]>(data, error, "Não foi possível carregar a atividade recente.");
    },
  });
}

export type DeliveryEvent = Tables<"delivery_events">;
export type MentorshipSession = Tables<"mentorship_sessions">;

export function useDeliveryEvents() {
  return useQuery({
    queryKey: ["delivery-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMentorshipSessions() {
  return useQuery({
    queryKey: ["mentorship-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorship_sessions")
        .select("*")
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------- catálogo, agenda e créditos
export type CatalogItem = Tables<"service_catalog">;
export type Appointment = Tables<"appointments">;
export type AppointmentEvent = Tables<"appointment_events">;
export type SessionCredit = Tables<"session_credits">;

export function useCatalog() {
  return useQuery({
    queryKey: ["service-catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_catalog")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      return guard<CatalogItem[]>(data, error, "Não foi possível carregar o catálogo.");
    },
  });
}

/** Catálogo completo (inclui itens desativados) — leitura restrita pela RLS. */
export function useCatalogAll() {
  return useQuery({
    queryKey: ["service-catalog-all"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_catalog")
        .select("*")
        .order("sort_order", { ascending: true });
      return guard<CatalogItem[]>(data, error, "Não foi possível carregar o catálogo.");
    },
  });
}

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("starts_at", { ascending: true, nullsFirst: false });
      return guard<Appointment[]>(data, error, "Não foi possível carregar a agenda.");
    },
  });
}

export function useAppointmentEvents(appointmentId: string | null) {
  return useQuery({
    queryKey: ["appointment-events", appointmentId],
    enabled: Boolean(appointmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_events")
        .select("*")
        .eq("appointment_id", appointmentId!)
        .order("created_at", { ascending: false });
      return guard<AppointmentEvent[]>(data, error, "Não foi possível carregar o histórico.");
    },
  });
}

export function useSessionCredits() {
  return useQuery({
    queryKey: ["session-credits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("session_credits").select("*");
      return guard<SessionCredit[]>(data, error, "Não foi possível carregar os créditos.");
    },
  });
}
