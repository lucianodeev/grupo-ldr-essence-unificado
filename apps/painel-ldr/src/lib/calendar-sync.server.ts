// Server-only: orquestração (saga) entre o agendamento do banco e o Google
// Calendar da conta contacto@ldrrhestrategia.com.
//
// Princípios:
// - Tudo é derivado do banco (pedido, pagamento, cliente, serviço). Nada de
//   parâmetros livres do navegador.
// - Nunca enviamos ao Google: prontuário, notas clínicas, internal_notes,
//   preço, telefone, documentos, número do pedido ou conteúdo do pedido.
//   Só título seguro do serviço, horários e o e-mail do cliente convidado.
// - Idempotência por appointment_id garantida por um lease atômico no
//   PostgreSQL (claim/release, service_role apenas): uma segunda chamada
//   simultânea nunca chega a criar evento.
// - Falha fechada: todo erro do banco interrompe a saga; o id do evento é
//   persistido antes de qualquer outra escrita, evitando evento órfão.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CALENDAR_ID,
  CalendarError,
  cancelEvent,
  createEvent,
  findEventByAppointment,
  hasConflict,
  isCalendarConfigured,
  patchEvent,
} from "@/lib/google-calendar.server";

export type SyncStatus = "pendente" | "sincronizado" | "erro" | "conflito" | "cancelado" | "manual";

export type SyncOutcome = {
  status: SyncStatus;
  meetUrl: string | null;
  errorCode: string | null;
};

/** Códigos curtos e sem PII, usados na UI e na auditoria. */
export type SyncErrorCode =
  | "nao_configurado"
  | "sem_horario"
  | "nao_elegivel"
  | "sem_email"
  | "sem_meet"
  | "conflito"
  | "ocupado"
  | "estado_invalido"
  | string;

export class CalendarSyncError extends Error {
  code: SyncErrorCode;
  constructor(code: SyncErrorCode) {
    super(code);
    this.code = code;
  }
}

export type CalendarContext = {
  appointmentId: string;
  summary: string;
  startsAtIso: string;
  endsAtIso: string;
  attendeeEmail: string;
};

type AppointmentRow = {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  catalog_key: string | null;
  starts_at: string | null;
  duration_minutes: number | null;
};

/** Segundos de validade do lease: cobre a chamada ao Google com folga. */
const LEASE_SECONDS = 120;

/**
 * Monta o contexto do evento exclusivamente a partir do banco.
 *
 * Elegibilidade fail-closed: só sincroniza agendamento ligado a um pedido
 * existente, pago e do MESMO cliente do agendamento. Reuniões de projeto não
 * geram nova cobrança por encontro, mas precisam pertencer ao pedido pago.
 * `overrideStart`/`overrideDuration` só chegam de uma ação de staff validada.
 */
export async function buildCalendarContext(
  appointmentId: string,
  overrideStart?: string,
  overrideDuration?: number,
): Promise<CalendarContext> {
  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .select("id, order_id, customer_id, catalog_key, starts_at, duration_minutes")
    .eq("id", appointmentId)
    .maybeSingle<AppointmentRow>();
  if (appointmentError) throw new CalendarSyncError("banco_indisponivel");
  if (!appointment) throw new CalendarSyncError("nao_elegivel");

  const startsAt = overrideStart ?? appointment.starts_at;
  if (!startsAt) throw new CalendarSyncError("sem_horario");
  const duration = overrideDuration ?? appointment.duration_minutes ?? 50;

  if (!appointment.order_id || !appointment.customer_id) {
    throw new CalendarSyncError("nao_elegivel");
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id, payment_status, catalog_key")
    .eq("id", appointment.order_id)
    .maybeSingle();
  if (orderError) throw new CalendarSyncError("banco_indisponivel");
  if (!order) throw new CalendarSyncError("nao_elegivel");
  if (order.payment_status !== "pago") throw new CalendarSyncError("nao_elegivel");
  if (order.customer_id !== appointment.customer_id) {
    throw new CalendarSyncError("nao_elegivel");
  }

  const catalogKey = appointment.catalog_key ?? order.catalog_key;

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("email")
    .eq("id", appointment.customer_id)
    .maybeSingle();
  if (customerError) throw new CalendarSyncError("banco_indisponivel");
  const attendeeEmail = customer?.email?.trim() ?? "";
  if (!attendeeEmail) throw new CalendarSyncError("sem_email");

  // Título seguro: nome do serviço no catálogo, jamais o número do pedido.
  let summary = "Encontro Grupo LDR Essence";
  if (catalogKey) {
    const { data: item } = await supabaseAdmin
      .from("service_catalog")
      .select("name")
      .eq("catalog_key", catalogKey)
      .maybeSingle();
    if (item?.name) summary = item.name;
  }

  const startIso = new Date(startsAt).toISOString();
  const endIso = new Date(new Date(startIso).getTime() + duration * 60000).toISOString();

  return {
    appointmentId: appointment.id,
    summary,
    startsAtIso: startIso,
    endsAtIso: endIso,
    attendeeEmail,
  };
}

type SyncRow = {
  appointment_id: string;
  google_event_id: string | null;
  meet_url: string | null;
  sync_status: string | null;
  attempts: number | null;
};

/** Leitura fail-closed: erro do banco interrompe a saga. */
async function readSyncRow(appointmentId: string): Promise<SyncRow | null> {
  const { data, error } = await supabaseAdmin
    .from("appointment_calendar_sync")
    .select("appointment_id, google_event_id, meet_url, sync_status, attempts")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (error) throw new CalendarSyncError("banco_indisponivel");
  return (data as SyncRow | null) ?? null;
}

/** Escrita fail-closed usada fora do lease (estados terminais simples). */
async function writeSyncRow(
  appointmentId: string,
  patch: {
    sync_status?: SyncStatus;
    google_event_id?: string | null;
    meet_url?: string | null;
    last_error_code?: string | null;
    touchAttempt?: boolean;
  },
) {
  const { touchAttempt, ...fields } = patch;
  const { error } = await supabaseAdmin.from("appointment_calendar_sync").upsert(
    {
      appointment_id: appointmentId,
      calendar_id: CALENDAR_ID,
      ...fields,
      ...(touchAttempt ? { last_attempt_at: new Date().toISOString() } : {}),
    },
    { onConflict: "appointment_id" },
  );
  if (error) throw new CalendarSyncError("banco_indisponivel");
}

type Claim = {
  claimed: boolean;
  lease_token: string | null;
  google_event_id: string | null;
  meet_url: string | null;
  sync_status: string | null;
  attempts: number | null;
};

/** Claim atômico (CAS) por appointment_id. Sem lease, nada vai ao Google. */
async function claimSync(appointmentId: string): Promise<Claim> {
  const { data, error } = await supabaseAdmin.rpc("claim_calendar_sync", {
    _appointment_id: appointmentId,
    _calendar_id: CALENDAR_ID,
    _lease_seconds: LEASE_SECONDS,
  });
  if (error) throw new CalendarSyncError("banco_indisponivel");
  const row = (Array.isArray(data) ? data[0] : data) as Claim | undefined;
  if (!row) throw new CalendarSyncError("banco_indisponivel");
  return row;
}

/** Libera o lease gravando o estado final; só o dono do token consegue. */
async function releaseSync(
  appointmentId: string,
  token: string,
  status: SyncStatus,
  eventId: string | null,
  meetUrl: string | null,
  errorCode: string | null,
) {
  // Os parâmetros são nullable no banco; os tipos gerados não refletem isso.
  const { data, error } = await supabaseAdmin.rpc("release_calendar_sync", {
    _appointment_id: appointmentId,
    _token: token,
    _status: status,
    _event_id: eventId,
    _meet_url: meetUrl,
    _error_code: errorCode,
  } as never);

  if (error) throw new CalendarSyncError("banco_indisponivel");
  // A RPC exige token exato: false = lease perdido/expirado (fail-closed).
  if (data !== true) throw new CalendarSyncError("estado_invalido");
}

/** Persiste o id do evento imediatamente após o Google responder. */
async function persistEventId(appointmentId: string, token: string, eventId: string | null) {
  const { data, error } = await supabaseAdmin
    .from("appointment_calendar_sync")
    .update({ google_event_id: eventId })
    .eq("appointment_id", appointmentId)
    .eq("lease_token", token)
    .select("appointment_id")
    .maybeSingle();
  if (error) throw new CalendarSyncError("banco_indisponivel");
  // Zero linhas = lease perdido para outra requisição: não seguimos adiante.
  if (!data) throw new CalendarSyncError("estado_invalido");
}

function codeOf(error: unknown): string {
  if (error instanceof CalendarSyncError) return error.code;
  if (error instanceof CalendarError) return error.code;
  return "indisponivel";
}

export function syncStatusOf(row: { sync_status?: string | null } | null | undefined): SyncStatus {
  const value = row?.sync_status;
  return (value as SyncStatus) ?? "pendente";
}

/**
 * A sala Meet pode demorar alguns instantes para ficar pronta. Relemos o MESMO
 * evento algumas vezes — nunca criamos outro — antes de desistir.
 */
async function awaitMeetUrl(eventId: string, tries = 3): Promise<string | null> {
  for (let i = 0; i < tries; i += 1) {
    const found = await findEventByAppointment(null, eventId);
    if (found?.meetUrl) return found.meetUrl;
  }
  return null;
}

/**
 * Cria ou atualiza o evento do agendamento. Sempre o MESMO evento:
 * primeiro pelo google_event_id salvo, depois pelo marcador privado no Google
 * (recuperação anti-órfão), e só então cria um novo.
 */
export async function syncAppointmentEvent(
  appointmentId: string,
  options: { overrideStart?: string; overrideDuration?: number; checkConflict?: boolean } = {},
): Promise<SyncOutcome> {
  if (!isCalendarConfigured()) {
    await writeSyncRow(appointmentId, {
      sync_status: "erro",
      last_error_code: "nao_configurado",
      touchAttempt: true,
    });
    return { status: "erro", meetUrl: null, errorCode: "nao_configurado" };
  }

  const claim = await claimSync(appointmentId);
  if (!claim.claimed || !claim.lease_token) {
    // Outra requisição já está falando com o Google por este agendamento.
    return { status: "pendente", meetUrl: null, errorCode: "ocupado" };
  }
  const token = claim.lease_token;

  try {
    const context = await buildCalendarContext(
      appointmentId,
      options.overrideStart,
      options.overrideDuration,
    );

    let eventId = claim.google_event_id ?? null;
    if (!eventId) {
      const recovered = await findEventByAppointment(appointmentId, null);
      if (recovered) {
        eventId = recovered.eventId;
        // Persistimos o id recuperado antes de qualquer outra escrita.
        await persistEventId(appointmentId, token, eventId);
      }
    }

    if (options.checkConflict !== false) {
      const conflict = await hasConflict(context.startsAtIso, context.endsAtIso, eventId);
      if (conflict) {
        await releaseSync(appointmentId, token, "conflito", eventId, null, "conflito");
        return { status: "conflito", meetUrl: null, errorCode: "conflito" };
      }
    }

    let result;
    if (eventId) {
      try {
        result = await patchEvent(eventId, {
          summary: context.summary,
          startsAtIso: context.startsAtIso,
          endsAtIso: context.endsAtIso,
          attendeeEmail: context.attendeeEmail,
        });
      } catch (error) {
        // Evento apagado manualmente no Google: recria uma única vez.
        if (error instanceof CalendarError && error.code === "nao_encontrado") {
          await persistEventId(appointmentId, token, null);
          result = await createEvent(context);
        } else {
          throw error;
        }
      }
    } else {
      result = await createEvent(context);
    }

    // Id primeiro: mesmo que a etapa seguinte falhe, não fica evento órfão.
    await persistEventId(appointmentId, token, result.eventId);

    const meetUrl = result.meetUrl ?? (await awaitMeetUrl(result.eventId));
    if (!meetUrl) {
      // Sala ainda não disponível: estado seguro para retry no MESMO evento.
      await releaseSync(appointmentId, token, "pendente", result.eventId, null, "sem_meet");
      return { status: "pendente", meetUrl: null, errorCode: "sem_meet" };
    }

    await releaseSync(appointmentId, token, "sincronizado", result.eventId, meetUrl, null);
    return { status: "sincronizado", meetUrl, errorCode: null };
  } catch (error) {
    const code = codeOf(error);
    try {
      await releaseSync(appointmentId, token, "erro", null, null, code);
    } catch {
      // Estado do banco indisponível: o lease expira sozinho, sem duplicar evento.
    }
    return { status: "erro", meetUrl: null, errorCode: code };
  }
}

/**
 * Cancela o MESMO evento sob lease, para não competir com criação/patch
 * simultâneos. google_event_id é preservado como referência histórica.
 */
export async function cancelAppointmentEvent(appointmentId: string): Promise<SyncOutcome> {
  const existing = await readSyncRow(appointmentId);
  if (!existing) return { status: "cancelado", meetUrl: null, errorCode: null };

  const claim = await claimSync(appointmentId);
  if (!claim.claimed || !claim.lease_token) {
    // Outra operação está em andamento: não afirmamos cancelamento.
    return { status: "pendente", meetUrl: null, errorCode: "ocupado" };
  }
  const token = claim.lease_token;
  const eventId = claim.google_event_id ?? existing.google_event_id;

  if (!eventId) {
    await releaseSync(appointmentId, token, "cancelado", null, null, null);
    return { status: "cancelado", meetUrl: null, errorCode: null };
  }

  try {
    await cancelEvent(eventId);
  } catch (error) {
    const code = codeOf(error);
    if (code !== "nao_encontrado") {
      // Falha do Google: estado erro visível ao staff, link oculto ao cliente.
      await releaseSync(appointmentId, token, "erro", null, null, code);
      return { status: "erro", meetUrl: null, errorCode: code };
    }
  }

  await releaseSync(appointmentId, token, "cancelado", null, null, null);
  return { status: "cancelado", meetUrl: null, errorCode: null };
}

/** Marca a linha como pendente (reagendamento aguardando nova confirmação). */
export async function markSyncPending(appointmentId: string) {
  const existing = await readSyncRow(appointmentId);
  if (!existing) return;
  await writeSyncRow(appointmentId, { sync_status: "pendente", meet_url: null });
}

/** Registra que o link foi definido manualmente pela equipe (fallback auditado). */
export async function markManualLink(appointmentId: string): Promise<SyncOutcome> {
  const claim = await claimSync(appointmentId);
  if (!claim.claimed || !claim.lease_token) {
    // Sincronização em andamento: nunca sobrescrevemos.
    return { status: "pendente", meetUrl: null, errorCode: "ocupado" };
  }
  // _event_id null => COALESCE preserva qualquer google_event_id existente.
  await releaseSync(appointmentId, claim.lease_token, "manual", null, null, null);
  return { status: "manual", meetUrl: null, errorCode: null };
}

/** Estado de sincronização para a UI profissional (staff-only no chamador). */
export async function listCalendarSync() {
  const { data, error } = await supabaseAdmin
    .from("appointment_calendar_sync")
    .select(
      "appointment_id, sync_status, meet_url, last_error_code, attempts, last_attempt_at, google_event_id",
    );
  if (error) throw new CalendarSyncError("banco_indisponivel");
  return (data ?? []).map((row) => ({
    appointmentId: row.appointment_id,
    status: syncStatusOf(row),
    meetUrl: row.meet_url,
    errorCode: row.last_error_code,
    attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at,
    hasEvent: Boolean(row.google_event_id),
  }));
}
