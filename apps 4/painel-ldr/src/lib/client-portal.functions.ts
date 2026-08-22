import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseRescheduleRequest, parseScheduleRequest } from "@/lib/client-agenda.schemas";

function emailOf(claims: Record<string, unknown>): string | null {
  const value = claims["email"];
  return typeof value === "string" ? value : null;
}

export const getClientContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveClient } = await import("@/lib/client-portal.server");
    return resolveClient(context.userId, emailOf(context.claims));
  });

export const activateClientAccess = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const { requestClientActivation } = await import("@/lib/client-portal.server");
    return requestClientActivation(data.email);
  });

export const clientOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getClientOverview } = await import("@/lib/client-portal.server");
    return getClientOverview(context.userId, emailOf(context.claims));
  });

export const clientOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getClientOrderDetail } = await import("@/lib/client-portal.server");
    return getClientOrderDetail(context.userId, emailOf(context.claims), data.orderId);
  });

export const clientMentorship = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getClientMentorship } = await import("@/lib/client-portal.server");
    return getClientMentorship(context.userId, emailOf(context.claims));
  });

export const clientDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getClientDeliveries } = await import("@/lib/client-portal.server");
    return getClientDeliveries(context.userId, emailOf(context.claims));
  });

export const clientApproveDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { deliveryId: string }) => data)
  .handler(async ({ context, data }) => {
    const { approveDelivery } = await import("@/lib/client-portal.server");
    return approveDelivery(context.userId, emailOf(context.claims), data.deliveryId);
  });

export const clientRequestAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { deliveryId: string; comment: string }) => data)
  .handler(async ({ context, data }) => {
    const { requestDeliveryAdjustment } = await import("@/lib/client-portal.server");
    return requestDeliveryAdjustment(context.userId, emailOf(context.claims), data);
  });

export const clientUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fullName: string; phone: string | null }) => data)
  .handler(async ({ context, data }) => {
    const { updateClientProfile } = await import("@/lib/client-portal.server");
    return updateClientProfile(context.userId, emailOf(context.claims), data);
  });

export const clientContractCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getClientContractCatalog } = await import("@/lib/client-portal.server");
    return getClientContractCatalog(context.userId, emailOf(context.claims));
  });

export const clientAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getClientAgenda } = await import("@/lib/client-portal.server");
    return getClientAgenda(context.userId, emailOf(context.claims));
  });

export const clientRequestAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseScheduleRequest)
  .handler(async ({ context, data }) => {
    const { requestClientAppointment } = await import("@/lib/client-portal.server");
    return requestClientAppointment(context.userId, emailOf(context.claims), data);
  });

export const clientRescheduleAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseRescheduleRequest)
  .handler(async ({ context, data }) => {
    const { rescheduleClientAppointment } = await import("@/lib/client-portal.server");
    return rescheduleClientAppointment(context.userId, emailOf(context.claims), data);
  });

export const clientDigitalLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getClientDigitalLibrary } = await import("@/lib/client-portal.server");
    return getClientDigitalLibrary(context.userId, emailOf(context.claims));
  });


export const clientCreateDigitalCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productKey: "ebook_coragem_comecar" | "livro_menino_mamao"; market: "BR" | "INTL" }) => data)
  .handler(async ({ context, data }) => {
    const { createClientDigitalCheckout } = await import("@/lib/client-portal.server");
    return createClientDigitalCheckout(context.userId, emailOf(context.claims), data);
  });
