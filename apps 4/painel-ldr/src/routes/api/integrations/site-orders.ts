// Recepção de eventos do site principal (pedidos/pagamentos).
// Autenticação por Bearer token; apenas o SHA-256 do token existe no banco
// (private.integration_tokens). Todo o processamento acontece em uma única
// função transacional SECURITY DEFINER (private.process_site_order), de modo
// que qualquer falha desfaz inclusive a reserva do evento.
import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

const MAX_BODY = 16 * 1024;

const EVENT_TYPES = [
  // valores canônicos do site
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "payment_confirmation",
  "charge.refunded",
  // valores legados/PT ainda aceitos
  "order.created",
  "order.updated",
  "payment.confirmed",
  "request.created",
] as const;

const PAYMENT_STATUS = [
  "paid",
  "refunded",
  "partially_refunded",
  "pending",
  "failed",
  "pago",
  "reembolsado",
  "parcialmente_reembolsado",
  "pendente",
  "falhou",
] as const;

const OPERATIONAL_STATUS = [
  "payment_confirmed",
  "refunded",
  "partially_refunded",
  "novo",
  "em_analise",
  "em_andamento",
  "aguardando_cliente",
  "em_revisao",
  "concluido",
  "cancelado",
] as const;

const payloadSchema = z
  .object({
    event_id: z.string().min(1).max(200),
    event_type: z.enum(EVENT_TYPES),
    occurred_at: z.string().datetime().optional(),
    source: z.string().min(1).max(60).default("ldr_site"),
    order_external_ref: z.string().min(1).max(200),
    stripe_event_id: z.string().max(200).optional(),
    stripe_payment_link_id: z.string().max(200).optional(),
    stripe_checkout_session_id: z.string().max(200).optional(),
    customer_email: z.string().email().max(200),
    customer_name: z.string().max(200).optional(),
    customer_phone: z.string().max(60).optional(),
    catalog_key: z.string().max(80).optional(),
    service_name: z.string().max(200).optional(),
    amount_cents: z.number().int().min(0).max(100_000_000).optional(),
    currency: z.string().length(3).optional(),
    payment_status: z.enum(PAYMENT_STATUS).optional(),
    operational_status: z.enum(OPERATIONAL_STATUS).optional(),
    quantity: z.number().int().min(1).max(100).optional(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .strip();

function generic(status: number, message: string) {
  return new Response(JSON.stringify({ ok: status < 400, message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function eq(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const Route = createFileRoute("/api/integrations/site-orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          return generic(415, "Formato não suportado.");
        }

        // Limite de corpo antes de qualquer leitura completa.
        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY) {
          return generic(413, "Payload muito grande.");
        }

        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) return generic(401, "Não autorizado.");
        const token = auth.slice(7).trim();
        if (!token || token.length > 512) return generic(401, "Não autorizado.");

        // O schema `private` não é tipado no client gerado.
        const privateSchema = (
          supabaseAdmin as unknown as {
            schema: (name: string) => {
              from: (table: string) => {
                select: (cols: string) => Promise<{ data: unknown[] | null }>;
                update: (patch: Record<string, unknown>) => {
                  eq: (col: string, value: string) => Promise<unknown>;
                };
              };
            };
          }
        ).schema("private");

        const digest = createHash("sha256").update(token).digest("hex");
        const { data: tokens } = await privateSchema
          .from("integration_tokens")
          .select("id, token_sha256, active, source");

        const rows = (tokens ?? []) as {
          id: string;
          token_sha256: string;
          active: boolean;
          source: string;
        }[];
        const match = rows.find((t) => t.active && eq(t.token_sha256, digest));
        if (!match) return generic(401, "Não autorizado.");

        const raw = await request.text();
        if (new TextEncoder().encode(raw).length > MAX_BODY) {
          return generic(413, "Payload muito grande.");
        }

        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          return generic(400, "Payload inválido.");
        }

        const parsed = payloadSchema.safeParse(json);
        if (!parsed.success) return generic(400, "Payload inválido.");
        const source = match.source || parsed.data.source;

        // Processamento atômico: reserva do evento, cliente, pedido, histórico,
        // créditos e S8 dentro da mesma transação.
        const rpc = supabaseAdmin as unknown as {
          rpc: (
            name: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
        };

        const { data, error } = await rpc.rpc("process_site_order", {
          _source: source,
          _payload: parsed.data as unknown as Record<string, unknown>,
        });

        if (error) {
          // 22023 = payload/valores inválidos (falha fechada, sem retry).
          if (error.code === "22023") return generic(400, "Payload inválido.");
          // Qualquer outra falha desfez a transação: permitir retry do site.
          return generic(503, "Temporariamente indisponível.");
        }

        const result = (data ?? {}) as { status?: string };

        await privateSchema
          .from("integration_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", match.id);

        return generic(200, result.status === "duplicate" ? "Evento já processado." : "Evento recebido.");
      },
    },
  },
});
