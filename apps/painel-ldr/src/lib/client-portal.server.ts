// Server-only: área do cliente.
// Todos os dados do cliente passam por aqui com whitelist de campos.
// Clientes NÃO recebem policies diretas nas tabelas internas — nenhum acesso
// via Data API é possível com o token deles.
import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

function fail(message: string): never {
  throw new Error(message);
}

export type ClientCustomer = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
};

export type ClientContext =
  | { status: "ok"; customer: ClientCustomer }
  | { status: "blocked" }
  | { status: "unlinked"; email: string | null };

/**
 * Resolve o cliente da conta autenticada.
 * Vincula automaticamente (uma única vez) quando existe um cadastro de cliente
 * com o mesmo e-mail — evita conta/cadastro duplicado.
 */
export async function resolveClient(userId: string, email: string | null): Promise<ClientContext> {
  const mail = email?.trim().toLowerCase() ?? null;

  const { data: linked } = await supabaseAdmin
    .from("customers")
    .select("id, full_name, email, phone, portal_active")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (linked) {
    if (!linked.portal_active) return { status: "blocked" };
    return {
      status: "ok",
      customer: {
        id: linked.id,
        fullName: linked.full_name,
        email: linked.email,
        phone: linked.phone,
      },
    };
  }

  if (mail) {
    const { data: byEmail } = await supabaseAdmin
      .from("customers")
      .select("id, full_name, email, phone, portal_active, auth_user_id")
      .ilike("email", mail)
      .is("auth_user_id", null)
      .maybeSingle();

    if (byEmail) {
      const { data: bound } = await supabaseAdmin
        .from("customers")
        .update({ auth_user_id: userId, portal_linked_at: new Date().toISOString() })
        .eq("id", byEmail.id)
        .is("auth_user_id", null)
        .select("id, full_name, email, phone, portal_active")
        .maybeSingle();

      if (bound) {
        await audit(userId, mail, "client.account_linked", bound.id);
        if (!bound.portal_active) return { status: "blocked" };
        return {
          status: "ok",
          customer: {
            id: bound.id,
            fullName: bound.full_name,
            email: bound.email,
            phone: bound.phone,
          },
        };
      }
    }
  }

  return { status: "unlinked", email: mail };
}

async function requireClient(userId: string, email: string | null): Promise<ClientCustomer> {
  const ctx = await resolveClient(userId, email);
  if (ctx.status !== "ok") fail("Acesso negado.");
  return ctx.customer;
}

async function audit(
  actorId: string | null,
  actorEmail: string | null,
  action: string,
  target?: string | null,
  details?: Record<string, unknown>,
) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    target: target ?? null,
    details: (details ?? {}) as never,
  });
}

// ---------------------------------------------------------------- ativação

function requestOrigin(): string | null {
  try {
    const req = getRequest();
    const origin = req?.headers.get("origin");
    if (origin) return origin;
    const referer = req?.headers.get("referer");
    if (referer) return new URL(referer).origin;
  } catch {
    /* sem contexto de request */
  }
  return null;
}

/**
 * Primeiro acesso: cria (se necessário) a conta de autenticação do cliente e
 * dispara o e-mail de definição de senha. Resposta sempre genérica.
 */
export async function requestClientActivation(email: string) {
  const mail = email.trim().toLowerCase();
  const generic = { ok: true as const };
  if (!mail || !mail.includes("@")) return generic;

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, full_name, portal_active")
    .ilike("email", mail)
    .maybeSingle();

  if (!customer || !customer.portal_active) return generic;

  // Já é uma conta de equipe? Nesse caso não criamos acesso de cliente.
  const { data: staff } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", mail)
    .maybeSingle();
  if (staff) return generic;

  const origin = requestOrigin();
  const redirectTo = origin ? `${origin}/cliente/definir-senha` : undefined;

  // Cria a conta apenas se ainda não existir; erro de duplicidade é ignorado
  // de propósito para não revelar existência de conta.
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: mail,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { full_name: customer.full_name, account_kind: "cliente" },
  });

  void createError; // conta já existente → segue direto para o link de senha

  await supabaseAdmin.auth.resetPasswordForEmail(mail, redirectTo ? { redirectTo } : undefined);
  await audit(null, mail, "client.activation_requested", customer.id);

  return generic;
}

// ---------------------------------------------------------------- leitura

const ORDER_FIELDS =
  "id, order_number, title, description, service_type, status, payment_status, amount_cents, currency, due_date, created_at, updated_at, assignee_id";

const CLIENT_VISIBLE_HISTORY_FIELDS = new Set([
  "criado",
  "status",
  "pagamento",
  "prazo",
  "entrega",
  "cliente",
]);

export async function getClientOverview(userId: string, email: string | null) {
  const customer = await requireClient(userId, email);

  const [{ data: orders }, { data: mentorships }] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select(ORDER_FIELDS)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("mentorships")
      .select(
        "id, program_name, status, payment_status, scheduled_at, goal, client_summary, next_steps, created_at",
      )
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  const orderIds = (orders ?? []).map((o) => o.id);
  const deliveries = await listClientDeliveries(customer.id, orderIds);
  const sessions = await listClientSessions(mentorships ?? []);
  const history = await listClientHistory(orderIds, 10);

  return {
    customer,
    orders: orders ?? [],
    mentorships: mentorships ?? [],
    deliveries,
    sessions,
    history,
  };
}

async function listClientDeliveries(customerId: string, orderIds: string[]) {
  const filters: string[] = [`customer_id.eq.${customerId}`];
  if (orderIds.length) filters.push(`order_id.in.(${orderIds.join(",")})`);

  const { data } = await supabaseAdmin
    .from("deliveries")
    .select(
      "id, order_id, title, description, status, delivery_url, client_note, due_date, delivered_at, approved_at, needs_client_approval, created_at, updated_at",
    )
    .eq("client_visible", true)
    .or(filters.join(","))
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Sessões de mentoria do cliente. O link da videochamada só sai daqui quando a
 * mentoria dona da sessão está paga, a sessão está agendada/confirmada E a
 * sincronização do agendamento vinculado está concluída ('sincronizado' ou
 * 'manual'). Sem agendamento vinculado ou sem linha de sincronização, o link
 * nunca é exposto. A propriedade já foi garantida pelo chamador.
 */
async function listClientSessions(mentorships: { id: string; payment_status: string }[]) {
  const ids = mentorships.map((m) => m.id);
  if (!ids.length) return [];
  const paid = new Set(mentorships.filter((m) => m.payment_status === "pago").map((m) => m.id));

  const { data } = await supabaseAdmin
    .from("mentorship_sessions")
    .select(
      "id, mentorship_id, appointment_id, title, session_number, scheduled_at, duration_minutes, meeting_url, status, client_notes, confirmed_at",
    )
    .in("mentorship_id", ids)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const appointmentIds = (data ?? [])
    .map((s) => s.appointment_id)
    .filter((id): id is string => Boolean(id));

  const readyAppointments = new Set<string>();
  if (appointmentIds.length) {
    const { data: syncRows } = await supabaseAdmin
      .from("appointment_calendar_sync")
      .select("appointment_id, sync_status")
      .in("appointment_id", appointmentIds);
    for (const row of syncRows ?? []) {
      if (row.sync_status === "sincronizado" || row.sync_status === "manual") {
        readyAppointments.add(row.appointment_id);
      }
    }
  }

  return (data ?? []).map((s) => ({
    ...s,
    meeting_url:
      paid.has(s.mentorship_id) &&
      s.status === "agendada" &&
      Boolean(s.confirmed_at) &&
      Boolean(s.appointment_id) &&
      readyAppointments.has(s.appointment_id as string)
        ? s.meeting_url
        : null,
  }));
}

async function listClientHistory(orderIds: string[], limit: number) {
  if (!orderIds.length) return [];
  const { data } = await supabaseAdmin
    .from("order_history")
    .select("id, order_id, field, old_value, new_value, note, created_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  return (data ?? []).filter((h) => CLIENT_VISIBLE_HISTORY_FIELDS.has(h.field)).slice(0, limit);
}

export async function getClientOrderDetail(userId: string, email: string | null, orderId: string) {
  const customer = await requireClient(userId, email);

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("id", orderId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!order) fail("Pedido não encontrado.");

  const [deliveries, history] = await Promise.all([
    listClientDeliveries(customer.id, [order.id]),
    listClientHistory([order.id], 50),
  ]);

  const deliveryIds = deliveries.map((d) => d.id);
  let events: {
    id: string;
    delivery_id: string;
    event: string;
    comment: string | null;
    actor_kind: string;
    actor_label: string | null;
    created_at: string;
  }[] = [];

  if (deliveryIds.length) {
    const { data } = await supabaseAdmin
      .from("delivery_events")
      .select("id, delivery_id, event, comment, actor_kind, actor_label, created_at")
      .in("delivery_id", deliveryIds)
      .order("created_at", { ascending: false });
    events = data ?? [];
  }

  return {
    order,
    deliveries: deliveries.filter((d) => d.order_id === order.id),
    history,
    events,
  };
}

export async function getClientMentorship(userId: string, email: string | null) {
  const customer = await requireClient(userId, email);
  const { data: mentorships } = await supabaseAdmin
    .from("mentorships")
    .select(
      "id, program_name, status, payment_status, scheduled_at, goal, client_summary, next_steps, created_at",
    )
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const sessions = await listClientSessions(mentorships ?? []);
  return { mentorships: mentorships ?? [], sessions };
}

export async function getClientDeliveries(userId: string, email: string | null) {
  const customer = await requireClient(userId, email);
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, title")
    .eq("customer_id", customer.id);

  const deliveries = await listClientDeliveries(
    customer.id,
    (orders ?? []).map((o) => o.id),
  );
  const deliveryIds = deliveries.map((d) => d.id);

  let events: {
    id: string;
    delivery_id: string;
    event: string;
    comment: string | null;
    actor_kind: string;
    actor_label: string | null;
    created_at: string;
  }[] = [];
  if (deliveryIds.length) {
    const { data } = await supabaseAdmin
      .from("delivery_events")
      .select("id, delivery_id, event, comment, actor_kind, actor_label, created_at")
      .in("delivery_id", deliveryIds)
      .order("created_at", { ascending: false });
    events = data ?? [];
  }

  return { orders: orders ?? [], deliveries, events };
}

// ---------------------------------------------------------------- escrita

async function loadOwnedDelivery(customerId: string, deliveryId: string) {
  const { data: delivery } = await supabaseAdmin
    .from("deliveries")
    .select("id, order_id, customer_id, title, status, client_visible")
    .eq("id", deliveryId)
    .maybeSingle();

  if (!delivery || !delivery.client_visible) fail("Entrega não encontrada.");

  if (delivery.customer_id !== customerId) {
    if (!delivery.order_id) fail("Entrega não encontrada.");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", delivery.order_id)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!order) fail("Entrega não encontrada.");
  }

  return delivery;
}

export async function approveDelivery(userId: string, email: string | null, deliveryId: string) {
  const customer = await requireClient(userId, email);
  const delivery = await loadOwnedDelivery(customer.id, deliveryId);
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("deliveries")
    .update({ status: "aprovada", approved_at: now, needs_client_approval: false })
    .eq("id", delivery.id);

  await supabaseAdmin.from("delivery_events").insert({
    delivery_id: delivery.id,
    event: "aprovada",
    actor_kind: "cliente",
    actor_id: userId,
    actor_label: customer.fullName,
    comment: null,
  });

  if (delivery.order_id) {
    await supabaseAdmin.from("order_history").insert({
      order_id: delivery.order_id,
      actor_id: userId,
      actor_email: customer.email,
      field: "cliente",
      old_value: String(delivery.status),
      new_value: "aprovada",
      note: `Entrega aprovada pelo cliente: ${delivery.title}`,
    });
  }

  await audit(userId, customer.email, "client.delivery_approved", delivery.id);
  return { ok: true as const };
}

export async function requestDeliveryAdjustment(
  userId: string,
  email: string | null,
  input: { deliveryId: string; comment: string },
) {
  const customer = await requireClient(userId, email);
  const comment = input.comment.trim();
  if (comment.length < 5) fail("Descreva o ajuste solicitado.");

  const delivery = await loadOwnedDelivery(customer.id, input.deliveryId);

  await supabaseAdmin
    .from("deliveries")
    .update({
      status: "ajustes_solicitados",
      needs_client_approval: false,
      approved_at: null,
    })
    .eq("id", delivery.id);

  await supabaseAdmin.from("delivery_events").insert({
    delivery_id: delivery.id,
    event: "ajuste_solicitado",
    actor_kind: "cliente",
    actor_id: userId,
    actor_label: customer.fullName,
    comment,
  });

  if (delivery.order_id) {
    await supabaseAdmin.from("order_history").insert({
      order_id: delivery.order_id,
      actor_id: userId,
      actor_email: customer.email,
      field: "cliente",
      old_value: String(delivery.status),
      new_value: "ajustes_solicitados",
      note: `Ajuste solicitado em "${delivery.title}": ${comment}`,
    });
  }

  await audit(userId, customer.email, "client.adjustment_requested", delivery.id);
  return { ok: true as const };
}

export async function updateClientProfile(
  userId: string,
  email: string | null,
  input: { fullName: string; phone: string | null },
) {
  const customer = await requireClient(userId, email);
  const fullName = input.fullName.trim();
  if (fullName.length < 2) fail("Informe seu nome completo.");

  await supabaseAdmin
    .from("customers")
    .update({ full_name: fullName, phone: input.phone?.trim() || null })
    .eq("id", customer.id);

  await audit(userId, customer.email, "client.profile_updated", customer.id);
  return { ok: true as const };
}

// ------------------------------------------------- agenda e créditos (cliente)

/**
 * Agenda do cliente. O meeting_url só é devolvido quando o pedido está pago E
 * o agendamento está confirmado/agendado — nunca em listagens públicas.
 */
export async function getClientAgenda(userId: string, email: string | null) {
  const customer = await requireClient(userId, email);

  const [{ data: appointments }, { data: orders }, { data: credits }] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select(
        "id, order_id, catalog_key, title, status, starts_at, ends_at, duration_minutes, meeting_url, client_notes, client_visible, consumes_credit",
      )
      .eq("customer_id", customer.id)
      .eq("client_visible", true)
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("orders")
      .select("id, order_number, title, catalog_key, payment_status, status")
      .eq("customer_id", customer.id),
    supabaseAdmin
      .from("session_credits")
      .select("order_id, catalog_key, granted")
      .eq("customer_id", customer.id),
  ]);

  // Estado da sincronização Google: o Meet só vai ao cliente quando concluída.
  const appointmentIds = (appointments ?? []).map((a) => a.id);
  const { data: syncRows } = appointmentIds.length
    ? await supabaseAdmin
        .from("appointment_calendar_sync")
        .select("appointment_id, sync_status")
        .in("appointment_id", appointmentIds)
    : { data: [] as { appointment_id: string; sync_status: string }[] };
  const syncByAppointment = new Map((syncRows ?? []).map((r) => [r.appointment_id, r.sync_status]));

  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
  const catalogKeys = Array.from(
    new Set(
      [
        ...(orders ?? []).map((o) => o.catalog_key),
        ...(appointments ?? []).map((a) => a.catalog_key),
      ].filter((k): k is string => Boolean(k)),
    ),
  );

  const { data: catalog } = catalogKeys.length
    ? await supabaseAdmin
        .from("service_catalog")
        .select("catalog_key, name, billing_model, repeat_payment_url, currency, amount_cents")
        .in("catalog_key", catalogKeys)
    : { data: [] as never[] };

  const catalogByKey = new Map((catalog ?? []).map((c) => [c.catalog_key, c]));

  const safeAppointments = (appointments ?? []).map((a) => {
    const order = a.order_id ? orderById.get(a.order_id) : undefined;
    const paid = order?.payment_status === "pago";
    // Confirmação profissional explícita é obrigatória para o link existir.
    const confirmed = a.status === "confirmada";
    const sync = syncByAppointment.get(a.id) ?? null;
    // "manual" = link definido pela equipe como fallback auditado.
    // Sem linha de sincronização o link NUNCA é exposto (fail-closed).
    const meetReady = sync === "sincronizado" || sync === "manual";
    const meetingUrl = paid && confirmed && meetReady ? a.meeting_url : null;

    const meetState: "aguardando_pagamento" | "aguardando_confirmacao" | "preparando" | "pronto" =
      !paid
        ? "aguardando_pagamento"
        : !confirmed
          ? "aguardando_confirmacao"
          : meetingUrl
            ? "pronto"
            : "preparando";
    return {
      id: a.id,
      orderId: a.order_id,
      orderNumber: order?.order_number ?? null,
      title: a.title,
      status: a.status,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      durationMinutes: a.duration_minutes,
      clientNotes: a.client_notes,
      meetingUrl,
      meetState,
    };
  });

  // Saldo por pedido: cancelada nunca consome; reagendar não gera consumo novo.
  const balances = (credits ?? []).map((c) => {
    const used = (appointments ?? []).filter(
      (a) => a.order_id === c.order_id && a.consumes_credit && a.status !== "cancelada",
    ).length;
    const order = orderById.get(c.order_id);
    const item = c.catalog_key ? catalogByKey.get(c.catalog_key) : undefined;
    return {
      orderId: c.order_id,
      orderNumber: order?.order_number ?? null,
      serviceName: item?.name ?? order?.title ?? "Serviço",
      billingModel: item?.billing_model ?? "project",
      granted: c.granted,
      used,
      remaining: Math.max(c.granted - used, 0),
      // Botão "Pagar próxima sessão": apenas serviços de 1 sessão por pagamento.
      repeatPaymentUrl:
        item?.billing_model === "single_paid_session" && c.granted - used <= 0
          ? (item.repeat_payment_url ?? null)
          : null,
    };
  });

  const scheduling = await schedulingOptions(customer.id);

  return {
    customer,
    appointments: safeAppointments,
    balances,
    schedulable: scheduling.options,
  };
}

// ------------------------------------------- regras de agendamento do cliente

/** Serviços em que cada pedido pago libera exatamente 1 sessão. */
const SINGLE_SESSION_KEYS = new Set([
  "psicanalise_eu",
  "psicanalise_br",
  "psicanalise_clinica_eu",
  "psicanalise_clinica_br",
  "mentoria_sessao",
]);

/** Pacotes S8: quantidade de sessões incluídas, sem nova cobrança. */
const PACKAGE_SESSION_KEYS: Record<string, number> = { mentoria_4: 4, mentoria_8: 8 };

export type ScheduleOption = {
  orderId: string;
  orderNumber: string | null;
  serviceName: string;
  catalogKey: string | null;
  kind: "single" | "package" | "project";
  limit: number | null;
  used: number;
  remaining: number | null;
  consumesCredit: boolean;
  canRequest: boolean;
  blockedReason: "sem_credito" | "sessao_unica_usada" | null;
};

/**
 * Calcula, a partir do banco, quais pedidos pagos do cliente ainda permitem
 * solicitar um novo horário. Nada vem do cliente além do id do pedido.
 */
async function schedulingOptions(customerId: string): Promise<{
  options: ScheduleOption[];
  byOrderId: Map<string, ScheduleOption>;
}> {
  const [{ data: orders }, { data: appointments }, { data: credits }] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id, order_number, title, catalog_key, payment_status")
      .eq("customer_id", customerId)
      .eq("payment_status", "pago"),
    supabaseAdmin
      .from("appointments")
      .select("id, order_id, status, consumes_credit")
      .eq("customer_id", customerId),
    supabaseAdmin.from("session_credits").select("order_id, granted").eq("customer_id", customerId),
  ]);

  const keys = Array.from(
    new Set((orders ?? []).map((o) => o.catalog_key).filter((k): k is string => Boolean(k))),
  );
  const { data: catalog } = keys.length
    ? await supabaseAdmin
        .from("service_catalog")
        .select("catalog_key, name, billing_model, package_sessions")
        .in("catalog_key", keys)
    : { data: [] as never[] };

  const catalogByKey = new Map((catalog ?? []).map((c) => [c.catalog_key, c]));
  const grantedByOrder = new Map((credits ?? []).map((c) => [c.order_id, c.granted]));

  const options = (orders ?? []).map<ScheduleOption>((order) => {
    const key = order.catalog_key;
    const item = key ? catalogByKey.get(key) : undefined;
    const used = (appointments ?? []).filter(
      (a) => a.order_id === order.id && a.consumes_credit && a.status !== "cancelada",
    ).length;

    let kind: ScheduleOption["kind"] = "project";
    let limit: number | null = null;

    if ((key && SINGLE_SESSION_KEYS.has(key)) || item?.billing_model === "single_paid_session") {
      kind = "single";
      limit = 1;
    } else if ((key && key in PACKAGE_SESSION_KEYS) || item?.billing_model === "package_sessions") {
      kind = "package";
      limit =
        grantedByOrder.get(order.id) ??
        (key ? PACKAGE_SESSION_KEYS[key] : undefined) ??
        item?.package_sessions ??
        0;
    }

    const canRequest = limit === null ? true : used < limit;
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      serviceName: item?.name ?? order.title,
      catalogKey: key,
      kind,
      limit,
      used,
      remaining: limit === null ? null : Math.max(limit - used, 0),
      // Reuniões de projeto não consomem crédito; sessão/pacote sim.
      consumesCredit: kind !== "project",
      canRequest,
      blockedReason: canRequest ? null : kind === "single" ? "sessao_unica_usada" : "sem_credito",
    };
  });

  return { options, byOrderId: new Map(options.map((o) => [o.orderId, o])) };
}

function parseFutureDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail("Data inválida.");
  if (date.getTime() < Date.now() + 60_000) fail("Escolha um horário futuro.");
  if (date.getTime() > Date.now() + 365 * 24 * 3600_000) fail("Data muito distante.");
  return date.toISOString();
}

async function logAppointmentEvent(input: {
  appointmentId: string;
  event: string;
  userId: string;
  label: string;
  comment: string | null;
}) {
  await supabaseAdmin.from("appointment_events").insert({
    appointment_id: input.appointmentId,
    event: input.event,
    actor_kind: "cliente",
    actor_id: input.userId,
    actor_label: input.label,
    comment: input.comment,
    client_visible: true,
  });
}

/** Mensagens genéricas: o cliente nunca descobre dados de terceiros pelo erro. */
function schedulingError(code: string): never {
  switch (code) {
    case "not_paid":
      fail("Este pedido ainda não está pago. Conclua o pagamento para agendar.");
      break;
    case "no_credit":
      fail(
        "Você já utilizou todas as sessões deste pedido. Um novo pedido pago libera outra sessão.",
      );
      break;
    case "open_meeting":
      fail("Já existe uma reunião em aberto para este projeto.");
      break;
    case "past_date":
      fail("Escolha um horário futuro.");
      break;
    case "closed":
      fail("Este agendamento não pode mais ser alterado.");
      break;
    default:
      fail("Pedido indisponível para agendamento.");
  }
}

/**
 * Solicitação de agendamento pelo cliente. Toda a validação (posse do pedido,
 * pagamento, crédito de sessão) acontece numa única transação no banco, com
 * trava por pedido — dois cliques simultâneos nunca consomem a mesma sessão.
 * O horário fica PENDENTE até a confirmação profissional, que define o link.
 */
export async function requestClientAppointment(
  userId: string,
  email: string | null,
  input: { orderId: string; startsAt: string; note?: string | null | undefined },
) {
  const customer = await requireClient(userId, email);
  const startsAt = parseFutureDate(input.startsAt);
  const note = input.note?.trim().slice(0, 800) || null;

  const { data, error } = await supabaseAdmin.rpc("client_request_appointment", {
    _customer_id: customer.id,
    _order_id: input.orderId,
    _starts_at: startsAt,
    _duration: 50,
    _note: note ?? "",
    _actor: userId,
    _actor_label: customer.fullName,
  });

  if (error) fail("Não foi possível registrar sua solicitação.");
  const result = (data ?? {}) as { ok?: boolean; error?: string; appointment_id?: string };
  if (!result.ok) schedulingError(result.error ?? "invalid");

  return { ok: true as const, appointmentId: result.appointment_id ?? null };
}

/**
 * Reagendamento pelo cliente: nunca consome um novo crédito, remove o link
 * anterior e volta a ficar pendente de confirmação profissional. Também
 * transacional, com posse derivada no servidor.
 */
export async function rescheduleClientAppointment(
  userId: string,
  email: string | null,
  input: { appointmentId: string; startsAt: string; note?: string | null | undefined },
) {
  const customer = await requireClient(userId, email);
  const startsAt = parseFutureDate(input.startsAt);
  const note = input.note?.trim().slice(0, 800) || null;

  const { data, error } = await supabaseAdmin.rpc("client_reschedule_appointment", {
    _customer_id: customer.id,
    _appointment_id: input.appointmentId,
    _starts_at: startsAt,
    _note: note ?? "",
    _actor: userId,
    _actor_label: customer.fullName,
  });

  if (error) fail("Não foi possível solicitar o reagendamento.");
  const result = (data ?? {}) as { ok?: boolean; error?: string };
  if (!result.ok) schedulingError(result.error ?? "invalid");

  return { ok: true as const };
}

// ------------------------------------------------- contratação (catálogo)

import type { ContractItem } from "@/lib/contract-catalog";
import { CONTRACT_OPTIONS } from "@/lib/contract-catalog";

/**
 * Catálogo restrito para a página "Contratar e agendar": apenas serviços
 * ativos da whitelist. Valores/links vêm do banco; nenhum segredo é exposto.
 */
export async function getClientContractCatalog(userId: string, email: string | null) {
  await requireClient(userId, email);

  const keys = CONTRACT_OPTIONS.map((o) => o.catalogKey);
  const { data } = await supabaseAdmin
    .from("service_catalog")
    .select("catalog_key, name, category, currency, amount_cents, package_sessions, payment_url")
    .in("catalog_key", keys)
    .eq("active", true);

  const items: ContractItem[] = (data ?? [])
    .map((row) => {
      const opt = CONTRACT_OPTIONS.find((o) => o.catalogKey === row.catalog_key);
      if (!opt) return null;
      return {
        catalogKey: row.catalog_key,
        name: row.name,
        group: opt.group,
        region: opt.region,
        currency: row.currency,
        amountCents: row.amount_cents,
        originalCents: opt.originalCents,
        sessions: row.package_sessions ?? 1,
        paymentUrl: row.payment_url,
      };
    })
    .filter((i): i is ContractItem => i !== null);

  return { items };
}

// ---------------------------------------------------------------- biblioteca digital

export type ClientLibraryProduct = {
  key: "ebook_coragem_comecar" | "livro_menino_mamao";
  title: string;
  description: string;
  priceBrlCents: number;
  priceEurCents: number;
  entitled: boolean;
  purchaseUrl: string;
};

const DIGITAL_LIBRARY_PRODUCTS: Omit<ClientLibraryProduct, "entitled">[] = [
  {
    key: "ebook_coragem_comecar",
    title: "A Coragem de Começar",
    description:
      "E-book de empreendedorismo, coragem e recomeços. O acesso à leitura depende de compra confirmada para esta conta.",
    priceBrlCents: 990,
    priceEurCents: 490,
    purchaseUrl: "https://lucianoempreendendor.com/?produto=ebook#comprar",
  },
  {
    key: "livro_menino_mamao",
    title: "O Menino que Vendia Mamão",
    description:
      "Livro autobiográfico sobre trabalho, recomeços, estratégia e a coragem de continuar construindo.",
    priceBrlCents: 4990,
    priceEurCents: 2000,
    purchaseUrl: "https://lucianoempreendendor.com/?produto=livro#comprar",
  },
];

/**
 * Biblioteca do cliente. Autenticação apenas identifica a conta; a leitura é
 * liberada somente quando existe pedido pago do produto para o mesmo cliente.
 * Pedidos pagos identificam o produto por catalog_key ou metadata.product_key.
 * O checkout da área do cliente cria o pedido pendente e o webhook Stripe
 * confirma o pagamento antes de liberar o acesso.
 */
export async function getClientDigitalLibrary(userId: string, email: string | null) {
  const customer = await requireClient(userId, email);

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, catalog_key, payment_status, metadata")
    .eq("customer_id", customer.id)
    .eq("payment_status", "pago");

  const paidKeys = new Set<string>();
  for (const order of orders ?? []) {
    if (order.catalog_key) paidKeys.add(order.catalog_key);
    const metadata = order.metadata as Record<string, unknown> | null;
    const key = metadata && typeof metadata["product_key"] === "string" ? metadata["product_key"] : null;
    if (key) paidKeys.add(key);
  }

  const aliases: Record<ClientLibraryProduct["key"], string[]> = {
    ebook_coragem_comecar: ["ebook_coragem_comecar", "a_coragem_de_comecar", "ebook"],
    livro_menino_mamao: ["livro_menino_mamao", "menino_mamao", "livro"],
  };

  return {
    customer,
    products: DIGITAL_LIBRARY_PRODUCTS.map((product) => ({
      ...product,
      entitled: aliases[product.key].some((key) => paidKeys.has(key)),
    })),
  };
}


export type DigitalProductKey = "ebook_coragem_comecar" | "livro_menino_mamao";
export type DigitalMarket = "BR" | "INTL";

const DIGITAL_CHECKOUT_CONFIG: Record<
  DigitalProductKey,
  {
    title: string;
    brlCents: number;
    eurCents: number;
    brlPriceEnv: string;
    eurPriceEnv: string;
    fallbackBrlPrice?: string;
    fallbackEurPrice?: string;
  }
> = {
  ebook_coragem_comecar: {
    title: "A Coragem de Começar",
    brlCents: 990,
    eurCents: 490,
    brlPriceEnv: "STRIPE_EBOOK_PRICE_BRL",
    eurPriceEnv: "STRIPE_EBOOK_PRICE_EUR",
  },
  livro_menino_mamao: {
    title: "O Menino que Vendia Mamão",
    brlCents: 4990,
    eurCents: 2000,
    brlPriceEnv: "STRIPE_BOOK_PRICE_BRL",
    eurPriceEnv: "STRIPE_BOOK_PRICE_EUR",
    fallbackBrlPrice: "price_1U5T7FKlx2LyNGeBMxRYLiDS",
    fallbackEurPrice: "price_1U5T6zKlx2LyNGeBuv7dJJsI",
  },
};

function stripePriceFor(productKey: DigitalProductKey, market: DigitalMarket): string {
  const cfg = DIGITAL_CHECKOUT_CONFIG[productKey];
  const envName = market === "BR" ? cfg.brlPriceEnv : cfg.eurPriceEnv;
  const fallback = market === "BR" ? cfg.fallbackBrlPrice : cfg.fallbackEurPrice;
  const value = process.env[envName] || fallback;
  if (!value || !value.startsWith("price_")) fail(`${envName} não configurada.`);
  return value;
}

/** Cria Checkout Stripe no backend e registra o pedido pendente no painel. */
export async function createClientDigitalCheckout(
  userId: string,
  email: string | null,
  input: { productKey: DigitalProductKey; market: DigitalMarket },
) {
  const customer = await requireClient(userId, email);
  const config = DIGITAL_CHECKOUT_CONFIG[input.productKey];
  if (!config) fail("Produto inválido.");

  // Evita nova cobrança quando o cliente já possui acesso.
  const library = await getClientDigitalLibrary(userId, email);
  if (library.products.find((p) => p.key === input.productKey)?.entitled) {
    fail("Este produto já está disponível na sua biblioteca.");
  }

  const amountCents = input.market === "BR" ? config.brlCents : config.eurCents;
  const currency = input.market === "BR" ? "BRL" : "EUR";
  const priceId = stripePriceFor(input.productKey, input.market);

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      order_number: "",
      customer_id: customer.id,
      contact_email: customer.email,
      contact_phone: customer.phone,
      service_type: "produto_digital",
      title: config.title,
      description: "Compra digital pela Biblioteca / Plataforma",
      quantity: 1,
      amount_cents: amountCents,
      currency,
      payment_status: "pendente",
      status: "novo",
      priority: "media",
      source: "biblioteca_cliente",
      catalog_key: input.productKey,
      metadata: {
        product_key: input.productKey,
        market: input.market,
        auth_user_id: userId,
      },
    } as never)
    .select("id, order_number")
    .single();

  if (orderError || !order) fail("Não foi possível iniciar o pedido.");

  const secret = process.env["STRIPE_SECRET_KEY"];
  if (!secret) {
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    fail("STRIPE_SECRET_KEY não configurada.");
  }

  const request = getRequest();
  const requestUrl = request ? new URL(request.url) : null;
  const appOrigin =
    process.env["CLIENT_PANEL_URL"]?.replace(/\/$/, "") ||
    (requestUrl ? requestUrl.origin : "https://painel.ldrrhestrategia.com");

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set(
    "success_url",
    `${appOrigin}/cliente/biblioteca?payment=success&session_id={CHECKOUT_SESSION_ID}`,
  );
  params.set("cancel_url", `${appOrigin}/cliente/biblioteca?payment=cancel`);
  params.set("client_reference_id", userId);
  params.set("metadata[order_id]", order.id);
  params.set("metadata[product_key]", input.productKey);
  params.set("metadata[user_id]", userId);
  params.set("metadata[market]", input.market);
  params.set("payment_intent_data[metadata][order_id]", order.id);
  params.set("payment_intent_data[metadata][product_key]", input.productKey);
  params.set("payment_intent_data[metadata][user_id]", userId);
  if (customer.email) params.set("customer_email", customer.email);

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = (await stripeResponse.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!stripeResponse.ok || !session.id || !session.url) {
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    fail(session.error?.message || "Não foi possível abrir o checkout.");
  }

  await supabaseAdmin
    .from("orders")
    .update({
      stripe_checkout_session_id: session.id,
      external_ref: `stripe:${session.id}`,
      metadata: {
        product_key: input.productKey,
        market: input.market,
        auth_user_id: userId,
        stripe_price_id: priceId,
      },
    } as never)
    .eq("id", order.id);

  await audit(userId, customer.email, "digital.checkout_created", order.id, {
    product_key: input.productKey,
    market: input.market,
    order_number: order.order_number,
  });

  return { url: session.url, orderId: order.id, orderNumber: order.order_number };
}
