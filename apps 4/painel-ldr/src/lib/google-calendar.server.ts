// Server-only: cliente mínimo do Google Calendar via conector oficial Lovable.
// Nenhum token OAuth é lido, gravado ou trafegado pela aplicação: o gateway
// mantém e renova a credencial. Nunca enviamos prontuário, notas internas,
// preço, telefone, documentos ou número de pedido para o Google.
const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

export const CALENDAR_ID = "contacto@ldrrhestrategia.com";
export const CALENDAR_TIMEZONE = "Europe/Brussels";

export type CalendarErrorCode =
  | "nao_configurado"
  | "credencial_invalida"
  | "permissao_negada"
  | "nao_encontrado"
  | "limite_google"
  | "indisponivel"
  | "resposta_invalida";

export class CalendarError extends Error {
  code: CalendarErrorCode;
  constructor(code: CalendarErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Booleano apenas: nunca expomos valor ou hash das credenciais. */
export function isCalendarConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_CALENDAR_API_KEY"]);
}

function mapStatus(status: number): CalendarErrorCode {
  if (status === 401) return "credencial_invalida";
  if (status === 403) return "permissao_negada";
  if (status === 404) return "nao_encontrado";
  if (status === 429) return "limite_google";
  return "indisponivel";
}

async function gateway<T>(
  path: string,
  init: { method: string; body?: unknown } = { method: "GET" },
): Promise<T> {
  if (!isCalendarConfigured()) throw new CalendarError("nao_configurado");

  let response: Response;
  try {
    response = await fetch(`${GATEWAY}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
        "X-Connection-Api-Key": process.env["GOOGLE_CALENDAR_API_KEY"]!,
        "Content-Type": "application/json",
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
  } catch {
    throw new CalendarError("indisponivel");
  }

  if (!response.ok) throw new CalendarError(mapStatus(response.status));
  if (response.status === 204) return {} as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new CalendarError("resposta_invalida");
  }
}

const calendarPath = `/calendars/${encodeURIComponent(CALENDAR_ID)}`;

type GoogleEvent = {
  id?: string;
  status?: string;
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
};

export type CalendarEventResult = {
  eventId: string;
  meetUrl: string | null;
};

function extractMeetUrl(event: GoogleEvent): string | null {
  const entry = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video" && typeof e.uri === "string",
  );
  return entry?.uri ?? event.hangoutLink ?? null;
}

function toResult(event: GoogleEvent): CalendarEventResult {
  if (!event.id) throw new CalendarError("resposta_invalida");
  return { eventId: event.id, meetUrl: extractMeetUrl(event) };
}

/** Verifica conflito no calendário principal (apenas janelas ocupadas). */
export async function hasConflict(
  startsAtIso: string,
  endsAtIso: string,
  ignoreEventId: string | null,
): Promise<boolean> {
  const data = await gateway<{
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
  }>("/freeBusy", {
    method: "POST",
    body: { timeMin: startsAtIso, timeMax: endsAtIso, items: [{ id: CALENDAR_ID }] },
  });

  const busy = data.calendars?.[CALENDAR_ID]?.busy ?? [];
  if (busy.length === 0) return false;
  if (!ignoreEventId) return true;

  // Reagendamento: o próprio evento pode ocupar a janela consultada.
  const own = await findEventByAppointment(null, ignoreEventId);
  if (!own) return true;

  const start = new Date(startsAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  return busy.some((slot) => {
    const bs = new Date(slot.start).getTime();
    const be = new Date(slot.end).getTime();
    const overlaps = bs < end && be > start;
    const isOwn = bs === own.start && be === own.end;
    return overlaps && !isOwn;
  });
}

/** Recupera evento por id, ou pelo marcador privado do agendamento (anti-órfão). */
export async function findEventByAppointment(
  appointmentId: string | null,
  eventId: string | null,
): Promise<{ eventId: string; meetUrl: string | null; start: number; end: number } | null> {
  try {
    if (eventId) {
      const event = await gateway<GoogleEvent & { start?: { dateTime?: string }; end?: { dateTime?: string } }>(
        `${calendarPath}/events/${encodeURIComponent(eventId)}`,
      );
      if (!event.id || event.status === "cancelled") return null;
      return {
        eventId: event.id,
        meetUrl: extractMeetUrl(event),
        start: new Date(event.start?.dateTime ?? 0).getTime(),
        end: new Date(event.end?.dateTime ?? 0).getTime(),
      };
    }

    if (!appointmentId) return null;
    const list = await gateway<{
      items?: Array<GoogleEvent & { start?: { dateTime?: string }; end?: { dateTime?: string } }>;
    }>(
      `${calendarPath}/events?privateExtendedProperty=${encodeURIComponent(
        `ldr_appointment=${appointmentId}`,
      )}&showDeleted=false&maxResults=5`,
    );
    const found = (list.items ?? []).find((e) => e.id && e.status !== "cancelled");
    if (!found?.id) return null;
    return {
      eventId: found.id,
      meetUrl: extractMeetUrl(found),
      start: new Date(found.start?.dateTime ?? 0).getTime(),
      end: new Date(found.end?.dateTime ?? 0).getTime(),
    };
  } catch (error) {
    if (error instanceof CalendarError && error.code === "nao_encontrado") return null;
    throw error;
  }
}

type EventInput = {
  appointmentId: string;
  /** Título seguro: nome do serviço no catálogo. Sem pedido, preço ou notas. */
  summary: string;
  startsAtIso: string;
  endsAtIso: string;
  attendeeEmail: string;
};

const SAFE_DESCRIPTION =
  "Encontro agendado pelo painel do Grupo LDR Essence. O link de acesso também está disponível na Área do Cliente.";

/** Cria evento privado com Google Meet e um único convidado (o cliente). */
export async function createEvent(input: EventInput): Promise<CalendarEventResult> {
  const event = await gateway<GoogleEvent>(
    `${calendarPath}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      body: {
        summary: input.summary,
        description: SAFE_DESCRIPTION,
        visibility: "private",
        transparency: "opaque",
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: false,
        guestsCanModify: false,
        start: { dateTime: input.startsAtIso, timeZone: CALENDAR_TIMEZONE },
        end: { dateTime: input.endsAtIso, timeZone: CALENDAR_TIMEZONE },
        attendees: [{ email: input.attendeeEmail }],
        extendedProperties: { private: { ldr_appointment: input.appointmentId } },
        conferenceData: {
          createRequest: {
            // Determinístico por agendamento: repetir a ação não cria outra sala.
            requestId: `ldr-${input.appointmentId}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    },
  );
  return toResult(event);
}

/** Reagendamento: atualiza SEMPRE o mesmo evento, preservando a sala Meet. */
export async function patchEvent(
  eventId: string,
  input: Omit<EventInput, "appointmentId">,
): Promise<CalendarEventResult> {
  const event = await gateway<GoogleEvent>(
    `${calendarPath}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "PATCH",
      body: {
        summary: input.summary,
        start: { dateTime: input.startsAtIso, timeZone: CALENDAR_TIMEZONE },
        end: { dateTime: input.endsAtIso, timeZone: CALENDAR_TIMEZONE },
        attendees: [{ email: input.attendeeEmail }],
      },
    },
  );
  return toResult(event);
}

/** Cancelamento: remove o mesmo evento e notifica o convidado. */
export async function cancelEvent(eventId: string): Promise<void> {
  try {
    await gateway<unknown>(
      `${calendarPath}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE" },
    );
  } catch (error) {
    // Evento já removido no Google é sucesso do ponto de vista do cancelamento.
    if (error instanceof CalendarError && error.code === "nao_encontrado") return;
    throw error;
  }
}
