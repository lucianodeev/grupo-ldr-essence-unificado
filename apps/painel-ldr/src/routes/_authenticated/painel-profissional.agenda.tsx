import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  GhostButton,
  PageHeader,
  PrimaryButton,
  StatusBadge,
  TableWrap,
  Td,
  Th,
} from "@/components/central/ui";
import {
  cancelCalendarEventFn,
  confirmAppointmentFn,
  confirmWithGoogleMeetFn,
  createAppointmentFn,
  linkPaidOrderFn,
  listCalendarSyncFn,
  retryCalendarSyncFn,
  setAppointmentStatusFn,
  updateAppointmentFn,
} from "@/lib/agenda-admin.functions";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/catalog";
import { formatDateTime, labelOf, safeUrl, toLocalInput, toneOf } from "@/lib/central";
import { useI18n } from "@/lib/i18n";
import {
  useAppointments,
  useCatalog,
  useCustomers,
  useOrders,
  useSessionCredits,
} from "@/lib/central-data";

export const Route = createFileRoute("/_authenticated/painel-profissional/agenda")({
  component: AgendaPage,
});

/** Códigos conhecidos devolvidos pela sincronização Google. */
const MEET_ERROR_CODES = [
  "nao_elegivel",
  "sem_email",
  "conflito",
  "ocupado",
  "sem_horario",
  "nao_configurado",
  "banco_indisponivel",
  "indisponivel",
] as const;

/** Traduz o errorCode para uma chave i18n específica, com fallback genérico. */
function meetErrorKey(code: string | null | undefined): string {
  if (code && (MEET_ERROR_CODES as readonly string[]).includes(code)) {
    return `calendar.err.${code}`;
  }
  return "calendar.err.fallback";
}

function AgendaPage() {
  const queryClient = useQueryClient();
  const appointments = useAppointments();
  const customers = useCustomers();
  const orders = useOrders();
  const catalog = useCatalog();
  const credits = useSessionCredits();

  const createFn = useServerFn(createAppointmentFn);
  const confirmFn = useServerFn(confirmAppointmentFn);
  const statusFn = useServerFn(setAppointmentStatusFn);
  const detailsFn = useServerFn(updateAppointmentFn);
  const meetFn = useServerFn(confirmWithGoogleMeetFn);
  const retryFn = useServerFn(retryCalendarSyncFn);
  const cancelEventFn = useServerFn(cancelCalendarEventFn);
  const syncListFn = useServerFn(listCalendarSyncFn);
  const linkFn = useServerFn(linkPaidOrderFn);
  const { t } = useI18n();

  const calendarSync = useQuery({
    queryKey: ["calendar-sync"],
    queryFn: () => syncListFn({}),
    staleTime: 15_000,
  });

  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | AppointmentStatus>("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["session-credits"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-sync"] });
  };

  const syncOf = (appointmentId: string) =>
    (calendarSync.data ?? []).find((r) => r.appointmentId === appointmentId) ?? null;

  const syncLabel = (appointmentId: string) => {
    const row = syncOf(appointmentId);
    return row ? t(`calendar.status.${row.status}`) : t("calendar.status.none");
  };

  const syncTone = (appointmentId: string) => {
    const status = syncOf(appointmentId)?.status;
    if (status === "sincronizado") return "success" as const;
    if (status === "conflito" || status === "erro") return "danger" as const;
    return "neutral" as const;
  };

  // Mensagem específica por errorCode. Elegibilidade nunca vira "Google fora do ar".
  const outcomeToast = (result: { ok?: boolean; status?: string; errorCode?: string | null }) => {
    if (result.ok) {
      toast.success(t("calendar.status.sincronizado"));
      return;
    }
    const code = result.errorCode ?? (result.status === "conflito" ? "conflito" : null);
    toast.error(t(meetErrorKey(code)));
  };

  const confirmWithMeet = useMutation({
    mutationFn: (input: { appointmentId: string; startsAt: string }) => meetFn({ data: input }),
    onSuccess: (result) => {
      invalidate();
      outcomeToast(result);
    },
    onError: () => toast.error(t("calendar.errorHint")),
  });

  const retrySync = useMutation({
    mutationFn: (appointmentId: string) => retryFn({ data: { appointmentId } }),
    onSuccess: (result) => {
      invalidate();
      outcomeToast(result);
    },
    onError: () => toast.error(t("calendar.errorHint")),
  });

  const cancelEvent = useMutation({
    mutationFn: (appointmentId: string) => cancelEventFn({ data: { appointmentId } }),
    onSuccess: () => {
      invalidate();
      toast.success(t("calendar.status.cancelado"));
    },
    onError: () => toast.error(t("calendar.errorHint")),
  });

  const createAppointment = useMutation({
    mutationFn: async (form: FormData) => {
      const value = (k: string) => String(form.get(k) ?? "").trim();
      const starts = value("starts_at") ? new Date(value("starts_at")).toISOString() : null;
      return createFn({
        data: {
          title: value("title") || "Sessão",
          orderId: value("order_id") || null,
          customerId: value("customer_id") || null,
          startsAt: starts,
          durationMinutes: Number(value("duration_minutes") || 50),
          meetingUrl: value("meeting_url") || null,
          clientNotes: value("client_notes") || null,
          internalNotes: value("internal_notes") || null,
          consumesCredit: value("consumes_credit") === "on",
        },
      });
    },
    onSuccess: () => {
      setCreating(false);
      invalidate();
      toast.success("Agendamento criado.");
    },
    onError: () => toast.error("Não foi possível criar o agendamento. Revise os dados e o link."),
  });

  const confirmAppointment = useMutation({
    mutationFn: (input: { appointmentId: string; startsAt: string; meetingUrl: string }) =>
      confirmFn({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Agendamento confirmado e link liberado ao cliente.");
    },
    onError: () =>
      toast.error("Confirme com data futura e link https de videochamada (Meet, Zoom, Teams)."),
  });

  const changeStatus = useMutation({
    mutationFn: (input: { appointmentId: string; status: AppointmentStatus }) =>
      statusFn({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Agenda atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar o agendamento."),
  });

  const updateDetails = useMutation({
    mutationFn: (input: Record<string, unknown>) => detailsFn({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Agenda atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar o agendamento."),
  });

  const linkOrder = useMutation({
    mutationFn: (input: { appointmentId: string; orderId: string }) => linkFn({ data: input }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("calendar.link.done"));
    },
    onError: () => toast.error(t("calendar.link.error")),
  });

  const customerName = (id: string | null) =>
    (customers.data ?? []).find((c) => c.id === id)?.full_name ?? "—";
  const orderOf = (id: string | null) => (orders.data ?? []).find((o) => o.id === id) ?? null;
  const orderNumber = useCallback(
    (id: string | null) => (orders.data ?? []).find((o) => o.id === id)?.order_number ?? "—",
    [orders.data],
  );

  /** Elegível = pedido + cliente vinculados e pedido efetivamente pago. */
  const isEligible = (a: { order_id: string | null; customer_id: string | null }) =>
    Boolean(a.order_id && a.customer_id && orderOf(a.order_id)?.payment_status === "pago");

  const paidOrders = (orders.data ?? []).filter(
    (o) => o.payment_status === "pago" && o.customer_id,
  );

  const filtered = useMemo(() => {
    return (appointments.data ?? []).filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (customerFilter && a.customer_id !== customerFilter) return false;
      return true;
    });
  }, [appointments.data, statusFilter, customerFilter]);

  const balances = useMemo(() => {
    return (credits.data ?? []).map((c) => {
      const used = (appointments.data ?? []).filter(
        (a) => a.order_id === c.order_id && a.consumes_credit && a.status !== "cancelada",
      ).length;
      const item = (catalog.data ?? []).find((k) => k.catalog_key === c.catalog_key);
      return {
        orderId: c.order_id,
        number: orderNumber(c.order_id),
        service: item?.name ?? "Serviço",
        granted: c.granted,
        used,
        remaining: Math.max(c.granted - used, 0),
      };
    });
  }, [credits.data, appointments.data, catalog.data, orderNumber]);

  const selected = (appointments.data ?? []).find((a) => a.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Reuniões, sessões e videochamadas de todos os serviços."
        actions={
          <PrimaryButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Fechar" : "Novo agendamento"}
          </PrimaryButton>
        }
      />

      {creating && (
        <form
          className="s8-card mb-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createAppointment.mutate(new FormData(e.currentTarget));
          }}
        >
          <Field label="Título" htmlFor="title">
            <input id="title" name="title" className="s8-field" defaultValue="Sessão" required />
          </Field>
          <Field label="Pedido vinculado" htmlFor="order_id">
            <select id="order_id" name="order_id" className="s8-field">
              <option value="">— sem pedido —</option>
              {(orders.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {o.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cliente" htmlFor="customer_id">
            <select id="customer_id" name="customer_id" className="s8-field">
              <option value="">— usar cliente do pedido —</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Situação" htmlFor="status">
            <select id="status" name="status" className="s8-field" defaultValue="agendada">
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Início" htmlFor="starts_at">
            <input id="starts_at" name="starts_at" type="datetime-local" className="s8-field" />
          </Field>
          <Field label="Duração (min)" htmlFor="duration_minutes">
            <input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={10}
              defaultValue={50}
              className="s8-field"
            />
          </Field>
          <Field label="Link da videochamada" htmlFor="meeting_url">
            <input
              id="meeting_url"
              name="meeting_url"
              className="s8-field"
              placeholder="https://…"
            />
          </Field>
          <Field label="Consome crédito de sessão" htmlFor="consumes_credit">
            <input
              id="consumes_credit"
              name="consumes_credit"
              type="checkbox"
              defaultChecked
              className="h-5 w-5"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Nota visível ao cliente" htmlFor="client_notes">
              <textarea id="client_notes" name="client_notes" rows={2} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notas internas" htmlFor="internal_notes">
              <textarea id="internal_notes" name="internal_notes" rows={2} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <PrimaryButton type="submit" disabled={createAppointment.isPending}>
              Salvar agendamento
            </PrimaryButton>
            <GhostButton onClick={() => setCreating(false)}>Cancelar</GhostButton>
          </div>
        </form>
      )}

      <div className="s8-card mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Situação" htmlFor="f-status">
          <select
            id="f-status"
            className="s8-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | "")}
          >
            <option value="">Todas</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cliente" htmlFor="f-customer">
          <select
            id="f-customer"
            className="s8-field"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {(customers.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {balances.length > 0 && (
        <section className="s8-card mb-4">
          <h2 className="font-serif text-lg">Créditos de sessão</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {balances.map((b) => (
              <li key={b.orderId} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                <span className="font-bold text-primary">{b.number}</span> — {b.service}
                <span className="block text-xs text-muted-foreground">
                  {b.used} utilizada(s) • {b.remaining} restante(s) de {b.granted}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum agendamento"
          description="Crie um agendamento para registrar sessões, reuniões e videochamadas."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Quando</Th>
              <Th>Título</Th>
              <Th>Cliente</Th>
              <Th>Pedido</Th>
              <Th>Situação</Th>
              <Th>Videochamada</Th>
              <Th>{t("calendar.title")}</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <Td>{formatDateTime(a.starts_at)}</Td>
                <Td>{a.title}</Td>
                <Td>{customerName(a.customer_id)}</Td>
                <Td>{orderNumber(a.order_id)}</Td>
                <Td>
                  <StatusBadge tone={toneOf(APPOINTMENT_STATUSES, a.status)}>
                    {labelOf(APPOINTMENT_STATUSES, a.status)}
                  </StatusBadge>
                </Td>
                <Td>
                  {safeUrl(a.meeting_url) ? (
                    <a
                      className="font-bold text-primary underline"
                      href={safeUrl(a.meeting_url)!}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Entrar
                    </a>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <StatusBadge tone={syncTone(a.id)}>{syncLabel(a.id)}</StatusBadge>
                </Td>
                <Td>
                  <GhostButton
                    className="!px-3 !py-1.5"
                    onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                  >
                    {selectedId === a.id ? "Fechar" : "Abrir"}
                  </GhostButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {selected && (
        <section className="s8-card mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl">{selected.title}</h2>
            <GhostButton onClick={() => setSelectedId(null)}>Fechar</GhostButton>
          </div>

          <form
            className="mt-3 grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const when = String(form.get("confirm_starts_at") ?? "");
              confirmAppointment.mutate({
                appointmentId: selected.id,
                startsAt: when ? new Date(when).toISOString() : "",
                meetingUrl: String(form.get("confirm_url") ?? "").trim(),
              });
            }}
          >
            <div className="sm:col-span-2 text-sm text-muted-foreground">
              Confirmar libera o link da videochamada para o cliente dono do pedido pago.
            </div>
            <Field label="Data confirmada" htmlFor="confirm_starts_at">
              <input
                id="confirm_starts_at"
                name="confirm_starts_at"
                type="datetime-local"
                className="s8-field"
                defaultValue={toLocalInput(selected.starts_at)}
                required
              />
            </Field>
            <Field label="Link da videochamada (https)" htmlFor="confirm_url">
              <input
                id="confirm_url"
                name="confirm_url"
                className="s8-field"
                placeholder="https://meet.google.com/…"
                defaultValue={selected.meeting_url ?? ""}
                required
              />
            </Field>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <PrimaryButton
                type="button"
                disabled={confirmWithMeet.isPending || !isEligible(selected)}
                onClick={(e) => {
                  const form = e.currentTarget.closest("form");
                  const when = String(
                    new FormData(form as HTMLFormElement).get("confirm_starts_at") ?? "",
                  );
                  if (!when) {
                    toast.error(t("agenda.dateTime"));
                    return;
                  }
                  confirmWithMeet.mutate({
                    appointmentId: selected.id,
                    startsAt: new Date(when).toISOString(),
                  });
                }}
              >
                {t("calendar.confirmMeet")}
              </PrimaryButton>
              <GhostButton
                type="submit"
                disabled={confirmAppointment.isPending || !isEligible(selected)}
              >
                Confirmar com link manual
              </GhostButton>
            </div>
            {!isEligible(selected) && (
              <p className="sm:col-span-2 text-xs text-destructive">
                {t("calendar.notEligible")} {t("calendar.err.nao_elegivel")}
              </p>
            )}
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              {t("calendar.manualHint")}
            </p>
          </form>

          {!isEligible(selected) && (
            <form
              className="mt-3 grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const orderId = String(new FormData(e.currentTarget).get("link_order_id") ?? "");
                if (!orderId) return;
                linkOrder.mutate({ appointmentId: selected.id, orderId });
              }}
            >
              <div className="sm:col-span-2">
                <h3 className="font-serif text-lg">{t("calendar.link.title")}</h3>
                <p className="text-xs text-muted-foreground">{t("calendar.link.hint")}</p>
              </div>
              <Field label={t("calendar.link.order")} htmlFor="link_order_id">
                <select id="link_order_id" name="link_order_id" className="s8-field" required>
                  <option value="">—</option>
                  {paidOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {customerName(o.customer_id)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <PrimaryButton type="submit" disabled={linkOrder.isPending}>
                  {t("calendar.link.submit")}
                </PrimaryButton>
              </div>
            </form>
          )}

          <div className="mt-3 rounded-lg border border-border/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={syncTone(selected.id)}>{syncLabel(selected.id)}</StatusBadge>
              {isEligible(selected) && syncOf(selected.id)?.status !== "sincronizado" && (
                <GhostButton
                  className="!px-3 !py-1.5"
                  disabled={retrySync.isPending}
                  onClick={() => retrySync.mutate(selected.id)}
                >
                  {t("calendar.retry")}
                </GhostButton>
              )}
              {syncOf(selected.id)?.hasEvent === true && (
                <GhostButton
                  className="!px-3 !py-1.5"
                  disabled={cancelEvent.isPending}
                  onClick={() => cancelEvent.mutate(selected.id)}
                >
                  {t("calendar.cancelEvent")}
                </GhostButton>
              )}
            </div>
            {(syncOf(selected.id)?.status === "erro" ||
              syncOf(selected.id)?.status === "conflito") && (
              <p className="mt-2 text-xs text-destructive">
                {t(
                  meetErrorKey(
                    syncOf(selected.id)?.errorCode ??
                      (syncOf(selected.id)?.status === "conflito" ? "conflito" : null),
                  ),
                )}
              </p>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Início (reagendar não consome crédito)">
              <input
                type="datetime-local"
                className="s8-field"
                defaultValue={toLocalInput(selected.starts_at)}
                onBlur={(e) => {
                  if (!e.target.value) return;
                  updateDetails.mutate({
                    appointmentId: selected.id,
                    startsAt: new Date(e.target.value).toISOString(),
                  });
                }}
              />
            </Field>
            <Field label="Situação">
              <select
                className="s8-field"
                value={selected.status}
                onChange={(e) => {
                  const next = e.target.value as AppointmentStatus;
                  if (next === "confirmada" || next === "solicitada") {
                    toast.info("Use o bloco de confirmação acima para confirmar com link.");
                    return;
                  }
                  changeStatus.mutate({ appointmentId: selected.id, status: next });
                }}
              >
                {APPOINTMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Visível para o cliente">
              <select
                className="s8-field"
                value={selected.client_visible ? "sim" : "nao"}
                onChange={(e) =>
                  updateDetails.mutate({
                    appointmentId: selected.id,
                    clientVisible: e.target.value === "sim",
                  })
                }
              >
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Nota ao cliente">
              <textarea
                rows={3}
                className="s8-field"
                defaultValue={selected.client_notes ?? ""}
                onBlur={(e) =>
                  updateDetails.mutate({
                    appointmentId: selected.id,
                    clientNotes: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Notas internas (nunca vão ao cliente)">
              <textarea
                rows={3}
                className="s8-field"
                defaultValue={selected.internal_notes ?? ""}
                onBlur={(e) =>
                  updateDetails.mutate({
                    appointmentId: selected.id,
                    internalNotes: e.target.value,
                  })
                }
              />
            </Field>
          </div>
        </section>
      )}
    </div>
  );
}
