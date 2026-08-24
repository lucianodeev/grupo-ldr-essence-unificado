import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const MAX_BODY = 256 * 1024;
const TOLERANCE_SECONDS = 300;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function verifyStripeSignature(raw: string, header: string, secret: string): boolean {
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!timestamp || !signatures.length) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const a = Buffer.from(expected);
  return signatures.some((signature) => {
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

type StripeObject = {
  id?: string;
  payment_status?: string;
  amount_total?: number;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
};

type StripeEvent = {
  id: string;
  type: string;
  created?: number;
  data?: { object?: StripeObject };
};

async function markEvent(eventId: string, eventType: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (table: string) => any;
  };
  const { data, error } = await db
    .from("stripe_webhook_events")
    .insert({ event_id: eventId, event_type: eventType })
    .select("event_id")
    .maybeSingle();
  if (!error && data) return "new" as const;
  if (error?.code === "23505") return "duplicate" as const;
  throw error ?? new Error("Falha ao registrar evento Stripe.");
}

async function updateOrder(orderId: string, patch: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("orders").update(patch as never).eq("id", orderId);
  if (error) throw error;
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      GET: async () => json(405, { ok: false }),
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return json(503, { ok: false, error: "Webhook não configurado." });

        const len = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(len) && len > MAX_BODY) return json(413, { ok: false });

        const signature = request.headers.get("stripe-signature") ?? "";
        const raw = await request.text();
        if (new TextEncoder().encode(raw).length > MAX_BODY) return json(413, { ok: false });
        if (!verifyStripeSignature(raw, signature, secret)) return json(400, { ok: false });

        let event: StripeEvent;
        try {
          event = JSON.parse(raw) as StripeEvent;
        } catch {
          return json(400, { ok: false });
        }
        if (!event.id || !event.type) return json(400, { ok: false });

        try {
          if ((await markEvent(event.id, event.type)) === "duplicate") {
            return json(200, { received: true, duplicate: true });
          }

          const object = event.data?.object ?? {};
          const metadata = object.metadata ?? {};
          const orderId = metadata.order_id;

          if (orderId) {
            if (event.type === "checkout.session.completed") {
              if (object.payment_status !== "paid") return json(200, { received: true });
              await updateOrder(orderId, {
                payment_status: "pago",
                status: "concluido",
                stripe_checkout_session_id: object.id ?? null,
                metadata: {
                  ...metadata,
                  stripe_event_id: event.id,
                  paid_at: new Date().toISOString(),
                },
              });
            } else if (event.type === "checkout.session.expired") {
              await updateOrder(orderId, {
                payment_status: "falhou",
                status: "cancelado",
                metadata: { ...metadata, stripe_event_id: event.id, expired: true },
              });
            } else if (event.type === "payment_intent.payment_failed") {
              await updateOrder(orderId, {
                payment_status: "falhou",
                metadata: { ...metadata, stripe_event_id: event.id, payment_failed: true },
              });
            } else if (event.type === "charge.refunded") {
              await updateOrder(orderId, {
                payment_status: "reembolsado",
                status: "cancelado",
                metadata: { ...metadata, stripe_event_id: event.id, refunded: true },
              });
            }
          }

          return json(200, { received: true });
        } catch (error) {
          // Libera o event_id para o retry legítimo da Stripe quando o processamento falha.
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const db = supabaseAdmin as unknown as { from: (table: string) => any };
            await db.from("stripe_webhook_events").delete().eq("event_id", event.id);
          } catch {
            /* best effort */
          }
          console.error("Stripe webhook processing failed", error);
          return json(503, { received: false });
        }
      },
    },
  },
});
