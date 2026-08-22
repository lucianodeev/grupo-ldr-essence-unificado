import { useState } from "react";

import { StatusBadge } from "@/components/central/ui";
import {
  DELIVERY_EVENT_LABELS,
  DELIVERY_STATUSES,
  formatDate,
  formatDateTime,
  labelOf,
  safeUrl,
  toneOf,
} from "@/lib/central";
import { useDeliveryReview } from "@/lib/client-portal-data";

export type ClientDelivery = {
  id: string;
  order_id: string | null;
  title: string;
  description: string | null;
  status: string;
  delivery_url: string | null;
  client_note: string | null;
  due_date: string | null;
  delivered_at: string | null;
  approved_at: string | null;
  needs_client_approval: boolean;
  created_at: string;
};

export type ClientDeliveryEvent = {
  id: string;
  delivery_id: string;
  event: string;
  comment: string | null;
  actor_kind: string;
  actor_label: string | null;
  created_at: string;
};

export function DeliveryCard({
  delivery,
  events,
  orderLabel,
}: {
  delivery: ClientDelivery;
  events: ClientDeliveryEvent[];
  orderLabel?: string | null;
}) {
  const { approve, requestAdjustment } = useDeliveryReview();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  const url = safeUrl(delivery.delivery_url);
  const status = delivery.status as never;
  const canReview =
    delivery.needs_client_approval &&
    (delivery.status === "entregue" || delivery.status === "em_revisao");
  const busy = approve.isPending || requestAdjustment.isPending;

  function submitAdjustment(event: React.FormEvent) {
    event.preventDefault();
    if (comment.trim().length < 5) return;
    requestAdjustment.mutate(
      { deliveryId: delivery.id, comment: comment.trim() },
      {
        onSuccess: () => {
          setComment("");
          setOpen(false);
        },
      },
    );
  }

  return (
    <article className="s8-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg">{delivery.title}</h3>
          {orderLabel ? <p className="text-xs text-muted-foreground">{orderLabel}</p> : null}
        </div>
        <StatusBadge tone={toneOf(DELIVERY_STATUSES, status)}>
          {labelOf(DELIVERY_STATUSES, status)}
        </StatusBadge>
      </div>

      {delivery.description ? (
        <p className="mt-3 whitespace-pre-wrap text-sm">{delivery.description}</p>
      ) : null}
      {delivery.client_note ? (
        <div className="s8-notice mt-3">
          <p className="whitespace-pre-wrap text-sm">{delivery.client_note}</p>
        </div>
      ) : null}

      <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <dt className="font-bold uppercase tracking-wide">Prazo</dt>
          <dd>{formatDate(delivery.due_date)}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wide">Entregue em</dt>
          <dd>{formatDateTime(delivery.delivered_at)}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wide">Aprovado em</dt>
          <dd>{formatDateTime(delivery.approved_at)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Abrir material
          </a>
        ) : null}
        {canReview ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => approve.mutate(delivery.id)}
              className="rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--success, oklch(0.5 0.12 155))" }}
            >
              Aprovar entrega
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-primary hover:bg-accent disabled:opacity-60"
            >
              Solicitar ajuste
            </button>
          </>
        ) : null}
      </div>

      {open ? (
        <form className="mt-3" onSubmit={submitAdjustment}>
          <label className="s8-label" htmlFor={`adj-${delivery.id}`}>
            O que precisa ser ajustado? (obrigatório)
          </label>
          <textarea
            id={`adj-${delivery.id}`}
            required
            minLength={5}
            rows={4}
            className="s8-field"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Enviando…" : "Enviar solicitação"}
          </button>
        </form>
      ) : null}

      {events.length ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Histórico desta entrega
          </p>
          <ul className="mt-2 space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-semibold text-primary">
                  {DELIVERY_EVENT_LABELS[e.event] ?? e.event}
                </span>{" "}
                <span className="text-xs text-muted-foreground">
                  · {formatDateTime(e.created_at)}
                  {e.actor_label ? ` · ${e.actor_label}` : ""}
                </span>
                {e.comment ? <p className="whitespace-pre-wrap">{e.comment}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
