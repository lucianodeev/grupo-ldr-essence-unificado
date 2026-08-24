// Server-only: operações profissionais da agenda.
// Toda ação exige sessão válida + perfil autorizado (superadmin/colaborador),
// valida entrada com Zod e registra evento + auditoria.
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { resolveAccess } from "@/lib/access.server";
import {
  cancelAppointmentEvent,
  markManualLink,
  markSyncPending,
  syncAppointmentEvent,
} from "@/lib/calendar-sync.server";
import { calendarSyncSchema, confirmWithMeetSchema } from "@/lib/calendar-sync.schemas";
import {
  appointmentDetailsSchema,
  appointmentStatusSchema,
  confirmAppointmentSchema,
  confirmSessionSchema,
  createAppointmentSchema,
  linkPaidOrderSchema,
} from "@/lib/agenda-admin.schemas";

type Client = SupabaseClient<Database>;

function fail(message: string): never {
  throw new Error(message);
}

async function requireStaff(supabase: Client, userId: string) {
  const access = await resolveAccess(supabase, userId);
  if (!access.authorized) fail("Acesso negado.");
  return access;
}

async function audit(
  actorId: string,
  actorEmail: string | null,
  action: string,
  target: string,
  details: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    target,
    details: details as never,
  });
}

async function event(
  appointmentId: string,
  name: string,
  actorId: string,
  actorLabel: string | null,
  comment: string | null,
  clientVisible = true,
) {
  await supabaseAdmin.from("appointment_events").insert({
    appointment_id: appointmentId,
    event: name,
    actor_kind: "equipe",
    actor_id: actorId,
    actor_label: actorLabel,
    comment,
    client_visible: clientVisible,
  });
}

async function loadAppointment(id: string) {
  const { data } = await supabaseAdmin
    .from("appointments")
    .select("id, order_id, customer_id, catalog_key, title, status, starts_at, duration_minutes")
    .eq("id", id)
    .maybeSingle();
  if (!data) fail("Agendamento não encontrado.");
  return data;
}

/** Traduz erros do banco em mensagens genéricas, sem vazar detalhe interno. */
function scheduleFailure(message: string): never {
  if (message.includes("sessões restantes")) fail("Pacote sem sessões restantes.");
  if (message.includes("sem créditos")) fail("Pedido sem créditos de sessão.");
  if (message.includes("não encontrad")) fail("Agendamento não encontrado.");
  fail("Não foi possível confirmar o agendamento.");
}

/**
 * Confirma o horário e libera o link da videochamada para o dono do dado.
 * Appointment + mentorship_sessions + espelho S8 são gravados numa única
 * transação no banco (lock por pedido): se a vinculação falhar, nada é
 * confirmado e o link nunca chega a existir.
 */
export async function confirmAppointment(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = confirmAppointmentSchema.parse(raw);
  const appointment = await loadAppointment(input.appointmentId);

  const duration = input.durationMinutes ?? appointment.duration_minutes ?? 50;
  const startsAt = new Date(input.startsAt).toISOString();

  const { error } = await supabaseAdmin.rpc("confirm_appointment_tx", {
    _appointment_id: appointment.id,
    _starts: startsAt,
    _duration: duration,
    _meeting: input.meetingUrl,
    _client_note: input.clientNote ?? "",
  });
  if (error) scheduleFailure(error.message);

  // Fallback manual: link informado pela equipe, sem evento no Google.
  // Sob lease: se houver sincronização em andamento, não sobrescrevemos —
  // o estado fica pendente (link oculto ao cliente) e o painel sinaliza.
  const manual = await markManualLink(appointment.id);

  await event(appointment.id, "confirmada", userId, access.email, input.clientNote ?? null);
  await audit(userId, access.email, "appointment.confirmed", appointment.id, {
    order_id: appointment.order_id,
    origem: "manual",
    sync: manual.status,
  });

  return { ok: manual.status === "manual", status: manual.status } as const;
}

/**
 * Confirma o agendamento criando/atualizando UM evento privado com Google Meet
 * no calendário da empresa. Dados vêm do banco; o link só é gravado depois que
 * o Google devolve a sala. Repetir a ação nunca duplica evento.
 */
export async function confirmWithGoogleMeet(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = confirmWithMeetSchema.parse(raw);
  const appointment = await loadAppointment(input.appointmentId);

  const duration = input.durationMinutes ?? appointment.duration_minutes ?? 50;
  const startsAt = new Date(input.startsAt).toISOString();

  const outcome = await syncAppointmentEvent(appointment.id, {
    overrideStart: startsAt,
    overrideDuration: duration,
    checkConflict: true,
  });

  if (outcome.status !== "sincronizado" || !outcome.meetUrl) {
    await audit(userId, access.email, "calendar.event_error", appointment.id, {
      status: outcome.status,
      code: outcome.errorCode,
    });
    return { ok: false as const, status: outcome.status, errorCode: outcome.errorCode };
  }

  const { error } = await supabaseAdmin.rpc("confirm_appointment_tx", {
    _appointment_id: appointment.id,
    _starts: startsAt,
    _duration: duration,
    _meeting: outcome.meetUrl,
    _client_note: input.clientNote ?? "",
  });
  if (error) {
    // Compensação: a confirmação falhou (crédito/sessão/transação). Cancelamos
    // imediatamente o MESMO evento para não deixar convite órfão no Google.
    const compensation = await cancelAppointmentEvent(appointment.id);
    await audit(userId, access.email, "calendar.event_error", appointment.id, {
      code: "tx",
      compensation: compensation.status,
    });
    scheduleFailure(error.message);
  }

  await event(appointment.id, "confirmada", userId, access.email, input.clientNote ?? null);
  await audit(userId, access.email, "calendar.event_created", appointment.id, {
    order_id: appointment.order_id,
  });

  return { ok: true as const, status: "sincronizado" as const, errorCode: null };
}

/** Reprocessa a sincronização de um agendamento já confirmado (staff-only). */
export async function retryCalendarSync(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = calendarSyncSchema.parse(raw);
  const appointment = await loadAppointment(input.appointmentId);

  if (appointment.status !== "confirmada") fail("Confirme o agendamento antes de sincronizar.");
  if (!appointment.starts_at) fail("Defina o horário antes de sincronizar.");

  const outcome = await syncAppointmentEvent(appointment.id, { checkConflict: true });

  if (outcome.status === "sincronizado" && outcome.meetUrl) {
    // Mesma RPC transacional idempotente da confirmação: appointment +
    // mentorship_sessions + s8_sessions coerentes, sem consumir crédito de novo
    // (a alocação é vinculada ao appointment_id já existente).
    const { error } = await supabaseAdmin.rpc("confirm_appointment_tx", {
      _appointment_id: appointment.id,
      _starts: new Date(appointment.starts_at).toISOString(),
      _duration: appointment.duration_minutes ?? 50,
      _meeting: outcome.meetUrl,
      _client_note: "",
    });
    if (error) {
      const compensation = await cancelAppointmentEvent(appointment.id);
      await audit(userId, access.email, "calendar.event_error", appointment.id, {
        code: "tx",
        compensation: compensation.status,
      });
      scheduleFailure(error.message);
    }
  }

  await audit(
    userId,
    access.email,
    outcome.status === "sincronizado" ? "calendar.event_updated" : "calendar.event_error",
    appointment.id,
    { status: outcome.status, code: outcome.errorCode },
  );

  return {
    ok: outcome.status === "sincronizado",
    status: outcome.status,
    errorCode: outcome.errorCode,
  };
}

/** Cancela apenas o evento no Google, preservando o agendamento no painel. */
export async function cancelCalendarEvent(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = calendarSyncSchema.parse(raw);
  const appointment = await loadAppointment(input.appointmentId);

  const outcome = await cancelAppointmentEvent(appointment.id);
  // Link antigo nunca pode continuar visível em /cliente: limpamos os espelhos.
  // O histórico (appointment_events, audit_logs) é preservado.
  const mirrors = await clearMeetingMirrors(appointment.id);
  await audit(userId, access.email, "calendar.event_cancelled", appointment.id, {
    status: outcome.status,
    code: outcome.errorCode,
    mirrors: mirrors.ok ? "ok" : "falha",
  });
  return {
    ok: outcome.status === "cancelado" && mirrors.ok,
    status: outcome.status,
    errorCode: outcome.errorCode ?? (mirrors.ok ? null : "espelhos"),
  };
}

/**
 * Remove o link da videochamada do agendamento e de todos os espelhos.
 * Falha de qualquer uma das três atualizações é sinalizada ao painel — o link
 * segue oculto ao cliente pelo sync_status, mas não afirmamos que limpou.
 */
async function clearMeetingMirrors(appointmentId: string): Promise<{ ok: boolean }> {
  const results = await Promise.all([
    supabaseAdmin.from("appointments").update({ meeting_url: null }).eq("id", appointmentId),
    supabaseAdmin
      .from("mentorship_sessions")
      .update({ meeting_url: null, confirmed_at: null })
      .eq("appointment_id", appointmentId),
    supabaseAdmin
      .from("s8_sessions")
      .update({ meeting_url: null })
      .eq("appointment_id", appointmentId),
  ]);
  return { ok: results.every((result) => !result.error) };
}

/** Cancelar/concluir/reagendar. Cancelamento e reagendamento removem o link. */
export async function setAppointmentStatus(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = appointmentStatusSchema.parse(raw);
  const appointment = await loadAppointment(input.appointmentId);

  const clearsLink = input.status === "cancelada" || input.status === "reagendada";

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({
      status: input.status,
      ...(clearsLink ? { meeting_url: null } : {}),
    })
    .eq("id", appointment.id);
  if (error) fail("Não foi possível atualizar o agendamento.");

  if (clearsLink) {
    await supabaseAdmin
      .from("mentorship_sessions")
      .update({ meeting_url: null, confirmed_at: null })
      .eq("appointment_id", appointment.id);
    await supabaseAdmin
      .from("s8_sessions")
      .update({ meeting_url: null })
      .eq("appointment_id", appointment.id);
  }

  if (input.status === "cancelada") {
    const outcome = await cancelAppointmentEvent(appointment.id);
    await audit(userId, access.email, "calendar.event_cancelled", appointment.id, {
      status: outcome.status,
    });
  } else if (input.status === "reagendada") {
    // Mesmo evento é preservado e atualizado na próxima confirmação.
    await markSyncPending(appointment.id);
  }

  await event(appointment.id, input.status, userId, access.email, input.comment ?? null);
  await audit(userId, access.email, "appointment.status_changed", appointment.id, {
    from: appointment.status,
    to: input.status,
  });

  return { ok: true as const };
}

/** Ajustes internos: horário, notas e visibilidade. Nunca define link aqui. */
export async function updateAppointmentDetails(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = appointmentDetailsSchema.parse(raw);
  const appointment = await loadAppointment(input.appointmentId);

  const duration = input.durationMinutes ?? appointment.duration_minutes ?? 50;
  const startsAt = input.startsAt ? new Date(input.startsAt).toISOString() : undefined;

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({
      ...(startsAt
        ? {
            starts_at: startsAt,
            ends_at: new Date(new Date(startsAt).getTime() + duration * 60000).toISOString(),
            duration_minutes: duration,
          }
        : {}),
      ...(input.clientNotes === undefined ? {} : { client_notes: input.clientNotes || null }),
      ...(input.internalNotes === undefined ? {} : { internal_notes: input.internalNotes || null }),
      ...(input.clientVisible === undefined ? {} : { client_visible: input.clientVisible }),
    })
    .eq("id", appointment.id);
  if (error) fail("Não foi possível atualizar o agendamento.");

  // Reagendamento aprovado de um agendamento confirmado: atualiza o MESMO evento.
  if (startsAt && appointment.status === "confirmada") {
    const outcome = await syncAppointmentEvent(appointment.id, {
      overrideStart: startsAt,
      overrideDuration: duration,
      checkConflict: true,
    });
    if (outcome.status === "sincronizado" && outcome.meetUrl) {
      await supabaseAdmin
        .from("appointments")
        .update({ meeting_url: outcome.meetUrl })
        .eq("id", appointment.id);
    }
    await audit(
      userId,
      access.email,
      outcome.status === "sincronizado" ? "calendar.event_updated" : "calendar.event_error",
      appointment.id,
      { status: outcome.status, code: outcome.errorCode },
    );
  }

  await audit(userId, access.email, "appointment.updated", appointment.id);
  return { ok: true as const };
}

/** Criação manual pela equipe (encaixes e reuniões internas). */
export async function createStaffAppointment(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = createAppointmentSchema.parse(raw);

  let customerId = input.customerId ?? null;
  let catalogKey: string | null = null;

  if (input.orderId) {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, customer_id, catalog_key")
      .eq("id", input.orderId)
      .maybeSingle();
    if (!order) fail("Pedido não encontrado.");
    customerId = customerId ?? order.customer_id;
    catalogKey = order.catalog_key;
  }

  const startsAt = input.startsAt ? new Date(input.startsAt).toISOString() : null;
  const duration = input.durationMinutes;

  const { data: created, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      order_id: input.orderId ?? null,
      customer_id: customerId,
      catalog_key: catalogKey,
      title: input.title,
      status: input.meetingUrl ? "confirmada" : "agendada",
      starts_at: startsAt,
      ends_at: startsAt
        ? new Date(new Date(startsAt).getTime() + duration * 60000).toISOString()
        : null,
      duration_minutes: duration,
      meeting_url: input.meetingUrl ?? null,
      client_notes: input.clientNotes ?? null,
      internal_notes: input.internalNotes ?? null,
      consumes_credit: input.consumesCredit,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    fail(
      error.message.includes("crédito")
        ? "Sem crédito de sessão disponível para este pedido."
        : "Não foi possível criar o agendamento.",
    );
  }
  if (!created) fail("Não foi possível criar o agendamento.");

  await event(created.id, "criada", userId, access.email, null, false);
  await audit(userId, access.email, "appointment.created", created.id);

  return { ok: true as const, appointmentId: created.id };
}

/**
 * Confirma uma sessão de mentoria/S8 e libera o link para o cliente.
 * Sessão, espelho S8 e o agendamento vinculado são atualizados na mesma
 * transação do banco — sem updates sequenciais que possam divergir.
 */
export async function confirmMentorshipSession(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = confirmSessionSchema.parse(raw);

  const { data: session } = await supabaseAdmin
    .from("mentorship_sessions")
    .select("id")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (!session) fail("Sessão não encontrada.");

  const { error } = await supabaseAdmin.rpc("confirm_mentorship_session_tx", {
    _session_id: input.sessionId,
    _scheduled: new Date(input.scheduledAt).toISOString(),
    _meeting: input.meetingUrl,
  });
  if (error) {
    fail(
      error.message.includes("não encontrada")
        ? "Sessão não encontrada."
        : "Não foi possível confirmar a sessão.",
    );
  }

  await audit(userId, access.email, "mentorship_session.confirmed", input.sessionId);
  return { ok: true as const };
}

/**
 * Corrige agendamentos legados sem vínculo: associa um pedido PAGO e deriva
 * customer_id/catalog_key do próprio pedido no servidor (nunca do navegador).
 * Só preenche vínculo ausente ou reaceita o mesmo vínculo — nunca troca o
 * agendamento de cliente/pedido. Não consome crédito e preserva data, notas
 * e situação; a confirmação normal segue validando crédito e gerando um
 * único evento pelo mecanismo idempotente existente.
 */
export async function linkPaidOrder(supabase: Client, userId: string, raw: unknown) {
  const access = await requireStaff(supabase, userId);
  const input = linkPaidOrderSchema.parse(raw);
  const appointment = await loadAppointment(input.appointmentId);

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id, catalog_key, payment_status, order_number")
    .eq("id", input.orderId)
    .maybeSingle();
  if (!order) fail("Pedido não encontrado.");
  if (order.payment_status !== "pago") fail("O pedido precisa estar pago para ser vinculado.");
  if (!order.customer_id) fail("O pedido não tem cliente vinculado.");
  if (!order.catalog_key) fail("O pedido não tem serviço de catálogo vinculado.");

  const orderId = order.id;
  const customerId = order.customer_id;
  const catalogKey = order.catalog_key;

  // Só vínculo ausente ou idêntico. Troca de dono/serviço é sempre recusada.
  if (appointment.order_id && appointment.order_id !== orderId) {
    fail("Este agendamento já pertence a outro pedido.");
  }
  if (appointment.customer_id && appointment.customer_id !== customerId) {
    fail("Este agendamento já pertence a outro cliente.");
  }
  if (appointment.catalog_key && appointment.catalog_key !== catalogKey) {
    fail("Este agendamento já pertence a outro serviço do catálogo.");
  }

  // Guarda otimista: o UPDATE só passa se a linha ainda estiver exatamente no
  // estado que foi carregado acima (null onde era null, igual onde já era igual).
  let query = supabaseAdmin
    .from("appointments")
    .update({ order_id: orderId, customer_id: customerId, catalog_key: catalogKey })
    .eq("id", appointment.id);

  query =
    appointment.order_id === null ? query.is("order_id", null) : query.eq("order_id", orderId);

  query =
    appointment.customer_id === null
      ? query.is("customer_id", null)
      : query.eq("customer_id", customerId);
  query =
    appointment.catalog_key === null
      ? query.is("catalog_key", null)
      : query.eq("catalog_key", catalogKey);

  const { data: updated, error } = await query
    .select("id, order_id, customer_id, catalog_key")
    .maybeSingle();

  // Sem linha devolvida = corrida perdida ou estado alterado: falha sem sucesso falso.
  if (error || !updated) fail("Não foi possível vincular este pedido.");

  // Confirmação pós-update antes de registrar qualquer histórico.
  if (
    updated.order_id !== orderId ||
    updated.customer_id !== customerId ||
    updated.catalog_key !== catalogKey
  ) {
    fail("Não foi possível vincular este pedido.");
  }

  await event(
    appointment.id,
    "vinculada",
    userId,
    access.email,
    `Pedido ${order.order_number ?? ""}`.trim(),
    false,
  );
  await audit(userId, access.email, "appointment.order_linked", appointment.id, {
    order_id: orderId,
    customer_id: customerId,
    catalog_key: catalogKey,
  });

  return { ok: true as const };
}
