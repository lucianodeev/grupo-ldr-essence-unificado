import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, StatusBadge } from "@/components/central/ui";
import { APPOINTMENT_STATUSES } from "@/lib/catalog";
import { formatDateTime, safeUrl, toneOf } from "@/lib/central";
import { useAgendaActions, useClientAgenda } from "@/lib/client-portal-data";
import { useAppointmentStatusLabel, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_clientarea/cliente/agenda")({
  component: ClientAgendaPage,
});

/** Converte o valor de <input type="datetime-local"> em ISO local válido. */
function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function ClientAgendaPage() {
  const { t } = useI18n();
  const statusLabel = useAppointmentStatusLabel();
  const agenda = useClientAgenda();
  const { request, reschedule } = useAgendaActions();

  const [orderId, setOrderId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [note, setNote] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");

  if (agenda.isLoading) return <p className="s8-card">{t("state.loading")}</p>;

  const appointments = agenda.data?.appointments ?? [];
  const balances = agenda.data?.balances ?? [];
  const schedulable = agenda.data?.schedulable ?? [];
  const available = schedulable.filter((s) => s.canRequest);

  const submitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const iso = toIso(startsAt);
    if (!orderId || !iso) {
      toast.error(t("agenda.dateTime"));
      return;
    }
    request.mutate(
      { orderId, startsAt: iso, note: note.trim() || null },
      {
        onSuccess: () => {
          setOrderId("");
          setStartsAt("");
          setNote("");
          toast.success(t("agenda.sent"));
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const submitReschedule = (e: React.FormEvent, appointmentId: string) => {
    e.preventDefault();
    const iso = toIso(rescheduleAt);
    if (!iso) {
      toast.error(t("agenda.dateTime"));
      return;
    }
    reschedule.mutate(
      { appointmentId, startsAt: iso, note: null },
      {
        onSuccess: () => {
          setRescheduleId(null);
          setRescheduleAt("");
          toast.success(t("agenda.rescheduled"));
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-serif text-2xl">{t("agenda.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("agenda.subtitle")}</p>
      </header>

      {balances.length > 0 && (
        <section className="s8-card">
          <h2 className="font-serif text-lg">{t("credits.available")}</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {balances.map((b) => (
              <li key={b.orderId} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                <p className="font-bold">{b.serviceName}</p>
                <p className="text-xs text-muted-foreground">
                  {b.orderNumber ?? "—"} • {b.remaining}/{b.granted}
                </p>
                {safeUrl(b.repeatPaymentUrl) && (
                  <a
                    className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    href={safeUrl(b.repeatPaymentUrl)!}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t("action.payNext")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="s8-card">
        <h2 className="font-serif text-lg">{t("agenda.requestTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("agenda.pendingInfo")}</p>

        {available.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("agenda.noneSchedulable")}</p>
        ) : (
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={submitRequest}>
            <Field label={t("agenda.chooseOrder")} htmlFor="order">
              <select
                id="order"
                className="s8-field"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              >
                <option value="">—</option>
                {available.map((s) => (
                  <option key={s.orderId} value={s.orderId}>
                    {s.serviceName}
                    {s.orderNumber ? ` • ${s.orderNumber}` : ""}
                    {s.remaining !== null ? ` (${s.remaining})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("agenda.dateTime")} htmlFor="when">
              <input
                id="when"
                type="datetime-local"
                className="s8-field"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("agenda.note")} htmlFor="note">
                <textarea
                  id="note"
                  className="s8-field"
                  rows={2}
                  maxLength={800}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                disabled={request.isPending}
              >
                {request.isPending ? t("state.saving") : t("action.send")}
              </button>
            </div>
          </form>
        )}

        {schedulable.some((s) => !s.canRequest) && (
          <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
            {schedulable
              .filter((s) => !s.canRequest)
              .map((s) => (
                <li key={s.orderId}>
                  {s.serviceName}:{" "}
                  {s.blockedReason === "sessao_unica_usada"
                    ? t("agenda.singleUsed")
                    : t("agenda.packageExhausted")}
                </li>
              ))}
          </ul>
        )}
      </section>

      {appointments.length === 0 ? (
        <EmptyState title={t("agenda.empty")} description={t("agenda.emptyHelp")} />
      ) : (
        <ul className="grid gap-3">
          {appointments.map((a) => (
            <li key={a.id} className="s8-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-serif text-lg">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(a.startsAt)}
                    {a.orderNumber ? ` • ${a.orderNumber}` : ""}
                  </p>
                </div>
                <StatusBadge tone={toneOf(APPOINTMENT_STATUSES, a.status)}>
                  {statusLabel(a.status)}
                </StatusBadge>
              </div>
              {a.clientNotes && <p className="mt-2 text-sm">{a.clientNotes}</p>}

              {safeUrl(a.meetingUrl) ? (
                <a
                  className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  href={safeUrl(a.meetingUrl)!}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {t("action.join")}
                </a>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t(`meet.${a.meetState}`)}
                </p>
              )}

              {a.status !== "cancelada" && a.status !== "concluida" && (
                <div className="mt-3 border-t border-border/60 pt-3">
                  {rescheduleId === a.id ? (
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={(e) => submitReschedule(e, a.id)}
                    >
                      <Field label={t("agenda.rescheduleTitle")} htmlFor={`re-${a.id}`}>
                        <input
                          id={`re-${a.id}`}
                          type="datetime-local"
                          className="s8-field"
                          value={rescheduleAt}
                          onChange={(e) => setRescheduleAt(e.target.value)}
                          required
                        />
                      </Field>
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                        disabled={reschedule.isPending}
                      >
                        {t("action.send")}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
                        onClick={() => setRescheduleId(null)}
                      >
                        {t("action.close")}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                      onClick={() => {
                        setRescheduleId(a.id);
                        setRescheduleAt("");
                      }}
                    >
                      {t("action.reschedule")}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
