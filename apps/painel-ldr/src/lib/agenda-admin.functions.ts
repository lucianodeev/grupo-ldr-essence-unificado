import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calendarSyncSchema, confirmWithMeetSchema } from "@/lib/calendar-sync.schemas";
import { linkPaidOrderSchema } from "@/lib/agenda-admin.schemas";

export const confirmAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context, data }) => {
    const { confirmAppointment } = await import("@/lib/agenda-admin.server");
    return confirmAppointment(context.supabase, context.userId, data);
  });

export const setAppointmentStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context, data }) => {
    const { setAppointmentStatus } = await import("@/lib/agenda-admin.server");
    return setAppointmentStatus(context.supabase, context.userId, data);
  });

export const updateAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context, data }) => {
    const { updateAppointmentDetails } = await import("@/lib/agenda-admin.server");
    return updateAppointmentDetails(context.supabase, context.userId, data);
  });

export const createAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context, data }) => {
    const { createStaffAppointment } = await import("@/lib/agenda-admin.server");
    return createStaffAppointment(context.supabase, context.userId, data);
  });

export const confirmSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context, data }) => {
    const { confirmMentorshipSession } = await import("@/lib/agenda-admin.server");
    return confirmMentorshipSession(context.supabase, context.userId, data);
  });

export const confirmWithGoogleMeetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // Zod strict já na borda; o servidor revalida (defesa em profundidade).
  .inputValidator((data: unknown) => confirmWithMeetSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { confirmWithGoogleMeet } = await import("@/lib/agenda-admin.server");
    return confirmWithGoogleMeet(context.supabase, context.userId, data);
  });

export const retryCalendarSyncFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // Zod strict já na borda; o servidor revalida (defesa em profundidade).
  .inputValidator((data: unknown) => calendarSyncSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { retryCalendarSync } = await import("@/lib/agenda-admin.server");
    return retryCalendarSync(context.supabase, context.userId, data);
  });

export const cancelCalendarEventFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // Zod strict já na borda; o servidor revalida (defesa em profundidade).
  .inputValidator((data: unknown) => calendarSyncSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { cancelCalendarEvent } = await import("@/lib/agenda-admin.server");
    return cancelCalendarEvent(context.supabase, context.userId, data);
  });

/** Estado de sincronização Google para o painel (staff autorizado apenas). */
export const listCalendarSyncFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAccess } = await import("@/lib/access.server");
    const access = await resolveAccess(context.supabase, context.userId);
    if (!access.authorized) throw new Error("Acesso negado.");
    const { listCalendarSync } = await import("@/lib/calendar-sync.server");
    return listCalendarSync();
  });

/** Vincula um pedido pago a um agendamento legado (staff autorizado apenas). */
export const linkPaidOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => linkPaidOrderSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { linkPaidOrder } = await import("@/lib/agenda-admin.server");
    return linkPaidOrder(context.supabase, context.userId, data);
  });
