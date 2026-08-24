import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  GhostButton,
  PageHeader,
  PrimaryButton,
  StatusBadge,
} from "@/components/central/ui";
import { supabase } from "@/integrations/supabase/client";
import {
  DELIVERY_STATUSES,
  formatDate,
  formatDateTime,
  labelOf,
  toneOf,
} from "@/lib/central";
import type { DeliveryStatus } from "@/lib/central";
import {
  useCustomers,
  useDeliveries,
  useDeliveryEvents,
  useOrders,
  useTeam,
  type Delivery,
} from "@/lib/central-data";
import { DELIVERY_EVENT_LABELS } from "@/lib/central";

export const Route = createFileRoute("/_authenticated/painel-profissional/entregas")({
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const queryClient = useQueryClient();
  const deliveries = useDeliveries();
  const orders = useOrders();
  const team = useTeam();
  const customers = useCustomers();
  const events = useDeliveryEvents();
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | DeliveryStatus>("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
  };

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const v = (k: string) => String(form.get(k) ?? "").trim();
      const { error } = await supabase.from("deliveries").insert({
        order_id: v("order_id") || null,
        title: v("title"),
        description: v("description") || null,
        status: (v("status") || "pendente") as DeliveryStatus,
        due_date: v("due_date") || null,
        assignee_id: v("assignee_id") || null,
        delivery_url: v("delivery_url") || null,
        client_note: v("client_note") || null,
        customer_id: v("customer_id") || null,
        client_visible: form.get("client_visible") === "on",
        needs_client_approval: form.get("needs_client_approval") === "on",
      });
      if (error) throw new Error("Não foi possível criar a entrega.");
    },
    onSuccess: () => {
      setCreating(false);
      invalidate();
      toast.success("Entrega criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Delivery> }) => {
      const { error } = await supabase.from("deliveries").update(patch).eq("id", id);
      if (error) throw new Error("Não foi possível atualizar a entrega.");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Entrega atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orderLabel = (id: string | null) => {
    const o = (orders.data ?? []).find((x) => x.id === id);
    return o ? `${o.order_number} — ${o.title}` : "sem pedido vinculado";
  };
  const memberName = (id: string | null) => {
    const m = (team.data ?? []).find((t) => t.id === id);
    return m ? (m.fullName ?? m.email) : "—";
  };

  const list = (deliveries.data ?? []).filter((d) => !statusFilter || d.status === statusFilter);

  return (
    <div>
      <PageHeader
        title="Entregas"
        subtitle="Entregáveis vinculados a pedidos, com responsável, prazo e link de entrega."
        actions={
          <PrimaryButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Fechar" : "Nova entrega"}
          </PrimaryButton>
        }
      />

      {creating && (
        <form
          className="s8-card mb-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(new FormData(e.currentTarget));
          }}
        >
          <Field label="Título" htmlFor="title">
            <input id="title" name="title" className="s8-field" required />
          </Field>
          <Field label="Pedido vinculado" htmlFor="order_id">
            <select id="order_id" name="order_id" className="s8-field">
              <option value="">— sem vínculo —</option>
              {(orders.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {o.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" className="s8-field">
              {DELIVERY_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data prevista" htmlFor="due_date">
            <input id="due_date" name="due_date" type="date" className="s8-field" />
          </Field>
          <Field label="Responsável" htmlFor="assignee_id">
            <select id="assignee_id" name="assignee_id" className="s8-field">
              <option value="">— não atribuído —</option>
              {(team.data ?? [])
                .filter((m) => m.isActive)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName ?? m.email}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Cliente (área do cliente)" htmlFor="customer_id">
            <select id="customer_id" name="customer_id" className="s8-field">
              <option value="">— usar o cliente do pedido —</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Link da entrega" htmlFor="delivery_url">
            <input id="delivery_url" name="delivery_url" type="url" className="s8-field" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição" htmlFor="description">
              <textarea id="description" name="description" rows={3} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observação ao cliente" htmlFor="client_note">
              <textarea id="client_note" name="client_note" rows={2} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="client_visible" defaultChecked />
              Visível na área do cliente
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="needs_client_approval" />
              Exige aprovação do cliente
            </label>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <PrimaryButton type="submit" disabled={create.isPending}>
              Salvar entrega
            </PrimaryButton>
            <GhostButton onClick={() => setCreating(false)}>Cancelar</GhostButton>
          </div>
        </form>
      )}

      <div className="s8-card mb-4 max-w-xs">
        <Field label="Filtrar por status" htmlFor="f-status">
          <select
            id="f-status"
            className="s8-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | "")}
          >
            <option value="">Todos</option>
            {DELIVERY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhuma entrega registrada"
          description="Crie entregas a partir dos pedidos para acompanhar prazos e disponibilizar o link final ao cliente."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((d) => (
            <article key={d.id} className="s8-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-lg">{d.title}</h2>
                <StatusBadge tone={toneOf(DELIVERY_STATUSES, d.status)}>
                  {labelOf(DELIVERY_STATUSES, d.status)}
                </StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground">
                {orderLabel(d.order_id)} • responsável {memberName(d.assignee_id)} • prazo{" "}
                {formatDate(d.due_date)}
              </p>
              {d.description ? <p className="mt-2 text-sm">{d.description}</p> : null}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Status">
                  <select
                    className="s8-field"
                    value={d.status}
                    onChange={(e) =>
                      update.mutate({
                        id: d.id,
                        patch: { status: e.target.value as DeliveryStatus },
                      })
                    }
                  >
                    {DELIVERY_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Link da entrega">
                  <input
                    type="url"
                    className="s8-field"
                    defaultValue={d.delivery_url ?? ""}
                    onBlur={(e) =>
                      update.mutate({ id: d.id, patch: { delivery_url: e.target.value || null } })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Observação ao cliente">
                    <textarea
                      rows={2}
                      className="s8-field"
                      defaultValue={d.client_note ?? ""}
                      onBlur={(e) =>
                        update.mutate({ id: d.id, patch: { client_note: e.target.value || null } })
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={d.client_visible}
                    onChange={(e) =>
                      update.mutate({ id: d.id, patch: { client_visible: e.target.checked } })
                    }
                  />
                  Visível ao cliente
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={d.needs_client_approval}
                    onChange={(e) =>
                      update.mutate({
                        id: d.id,
                        patch: { needs_client_approval: e.target.checked },
                      })
                    }
                  />
                  Exige aprovação
                </label>
              </div>

              {(events.data ?? []).filter((ev) => ev.delivery_id === d.id).length > 0 && (
                <div className="mt-3 rounded-lg border border-border p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Retorno do cliente
                  </p>
                  <ul className="mt-2 space-y-2">
                    {(events.data ?? [])
                      .filter((ev) => ev.delivery_id === d.id)
                      .map((ev) => (
                        <li key={ev.id} className="text-sm">
                          <span className="font-semibold text-primary">
                            {DELIVERY_EVENT_LABELS[ev.event] ?? ev.event}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">
                            · {formatDateTime(ev.created_at)}
                            {ev.actor_label ? ` · ${ev.actor_label}` : ""}
                          </span>
                          {ev.comment ? (
                            <p className="whitespace-pre-wrap">{ev.comment}</p>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {d.status !== "entregue" ? (
                  <PrimaryButton
                    onClick={() =>
                      update.mutate({
                        id: d.id,
                        patch: { status: "entregue", delivered_at: new Date().toISOString() },
                      })
                    }
                  >
                    Marcar como entregue
                  </PrimaryButton>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Entregue em {formatDateTime(d.delivered_at)}
                  </span>
                )}
                {d.delivery_url ? (
                  <a
                    href={d.delivery_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-primary underline"
                  >
                    Abrir link
                  </a>
                ) : null}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Criada em {formatDateTime(d.created_at)} • atualizada em{" "}
                {formatDateTime(d.updated_at)}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
