import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PRIORITIES,
  SERVICE_TYPES,
  formatDate,
  formatDateTime,
  formatMoney,
  labelOf,
  toneOf,
} from "@/lib/central";
import type { OrderStatus, PaymentStatus, PriorityLevel, ServiceType } from "@/lib/central";
import {
  useCatalog,
  useCustomers,
  useOrderHistory,
  useOrders,
  useTeam,
  type Order,
} from "@/lib/central-data";

export const Route = createFileRoute("/_authenticated/painel-profissional/pedidos")({
  component: OrdersPage,
});

type SortKey = "created_at" | "due_date" | "order_number" | "status";

function OrdersPage() {
  const queryClient = useQueryClient();
  const orders = useOrders();
  const customers = useCustomers();
  const team = useTeam();
  const catalog = useCatalog();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | OrderStatus>("");
  const [serviceFilter, setServiceFilter] = useState<"" | ServiceType>("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    queryClient.invalidateQueries({ queryKey: ["order-history"] });
  };

  const createOrder = useMutation({
    mutationFn: async (form: FormData) => {
      const value = (k: string) => String(form.get(k) ?? "").trim();
      const amount = value("amount");
      const catalogKey = value("catalog_key") || null;
      const item = (catalog.data ?? []).find((c) => c.catalog_key === catalogKey) ?? null;
      const { error } = await supabase.from("orders").insert({
        catalog_key: catalogKey,
        title: value("title") || "Pedido sem título",
        customer_id: value("customer_id") || null,
        contact_email: value("contact_email") || null,
        contact_phone: value("contact_phone") || null,
        service_type: (value("service_type") || "outros") as ServiceType,
        description: value("description") || null,
        quantity: Number(value("quantity") || 1),
        amount_cents: amount
          ? Math.round(Number(amount.replace(",", ".")) * 100)
          : (item?.amount_cents ?? null),
        currency: value("currency") || item?.currency || "BRL",
        payment_status: (value("payment_status") || "pendente") as PaymentStatus,
        status: (value("status") || "novo") as OrderStatus,
        priority: (value("priority") || "media") as PriorityLevel,
        assignee_id: value("assignee_id") || null,
        due_date: value("due_date") || null,
        internal_notes: value("internal_notes") || null,
        order_number: "",
      });
      if (error) throw new Error("Não foi possível criar o pedido.");
    },
    onSuccess: () => {
      setCreating(false);
      invalidate();
      toast.success("Pedido criado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Order> }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw new Error("Não foi possível atualizar o pedido.");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pedido atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const customerName = (id: string | null) =>
    (customers.data ?? []).find((c) => c.id === id)?.full_name ?? "—";
  const memberName = (id: string | null) => {
    const m = (team.data ?? []).find((t) => t.id === id);
    return m ? (m.fullName ?? m.email) : "—";
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = (orders.data ?? []).filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (serviceFilter && o.service_type !== serviceFilter) return false;
      if (assigneeFilter && o.assignee_id !== assigneeFilter) return false;
      if (!term) return true;
      return [o.order_number, o.title, o.description, o.contact_email, customerName(o.customer_id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
    return [...rows].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [orders.data, search, statusFilter, serviceFilter, assigneeFilter, sortKey, sortAsc, customers.data]);

  const selected = (orders.data ?? []).find((o) => o.id === selectedId) ?? null;
  const history = useOrderHistory(selectedId);

  if (orders.isError) {
    return (
      <div className="s8-card">
        <h2 className="font-serif text-xl">Dados indisponíveis</h2>
        <p className="mt-2 text-sm">Não foi possível carregar os pedidos com esta conta.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Central de todos os serviços do ecossistema LDR."
        actions={
          <PrimaryButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Fechar" : "Novo pedido"}
          </PrimaryButton>
        }
      />

      {creating && (
        <form
          className="s8-card mb-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createOrder.mutate(new FormData(e.currentTarget));
          }}
        >
          <Field label="Título do pedido" htmlFor="title">
            <input id="title" name="title" className="s8-field" required />
          </Field>
          <Field label="Serviço do catálogo" htmlFor="catalog_key">
            <select id="catalog_key" name="catalog_key" className="s8-field">
              <option value="">— sem catálogo —</option>
              {(catalog.data ?? [])
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.catalog_key} value={c.catalog_key}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Categoria interna" htmlFor="service_type">
            <select id="service_type" name="service_type" className="s8-field">
              {SERVICE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cliente" htmlFor="customer_id">
            <select id="customer_id" name="customer_id" className="s8-field">
              <option value="">— sem vínculo —</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="E-mail de contato" htmlFor="contact_email">
            <input id="contact_email" name="contact_email" type="email" className="s8-field" />
          </Field>
          <Field label="Telefone (opcional)" htmlFor="contact_phone">
            <input id="contact_phone" name="contact_phone" className="s8-field" />
          </Field>
          <Field label="Quantidade" htmlFor="quantity">
            <input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="s8-field" />
          </Field>
          <Field label="Valor" htmlFor="amount">
            <input id="amount" name="amount" inputMode="decimal" placeholder="0,00" className="s8-field" />
          </Field>
          <Field label="Moeda" htmlFor="currency">
            <input id="currency" name="currency" defaultValue="BRL" className="s8-field" />
          </Field>
          <Field label="Pagamento" htmlFor="payment_status">
            <select id="payment_status" name="payment_status" className="s8-field">
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Situação" htmlFor="status">
            <select id="status" name="status" className="s8-field">
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade" htmlFor="priority">
            <select id="priority" name="priority" className="s8-field" defaultValue="media">
              {PRIORITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
          <Field label="Prazo de entrega" htmlFor="due_date">
            <input id="due_date" name="due_date" type="date" className="s8-field" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição/resumo" htmlFor="description">
              <textarea id="description" name="description" rows={3} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observações internas" htmlFor="internal_notes">
              <textarea id="internal_notes" name="internal_notes" rows={2} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <PrimaryButton type="submit" disabled={createOrder.isPending}>
              Salvar pedido
            </PrimaryButton>
            <GhostButton onClick={() => setCreating(false)}>Cancelar</GhostButton>
          </div>
        </form>
      )}

      <div className="s8-card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Pesquisar" htmlFor="q">
          <input
            id="q"
            className="s8-field"
            placeholder="Número, título, cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Situação" htmlFor="f-status">
          <select
            id="f-status"
            className="s8-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
          >
            <option value="">Todas</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Serviço" htmlFor="f-service">
          <select
            id="f-service"
            className="s8-field"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value as ServiceType | "")}
          >
            <option value="">Todos</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Responsável" htmlFor="f-assignee">
          <select
            id="f-assignee"
            className="s8-field"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {(team.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName ?? m.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ordenar por" htmlFor="f-sort">
          <div className="flex gap-2">
            <select
              id="f-sort"
              className="s8-field"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="created_at">Criação</option>
              <option value="due_date">Prazo</option>
              <option value="order_number">Número</option>
              <option value="status">Situação</option>
            </select>
            <GhostButton onClick={() => setSortAsc((v) => !v)} aria-label="Inverter ordem">
              {sortAsc ? "↑" : "↓"}
            </GhostButton>
          </div>
        </Field>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={(orders.data ?? []).length === 0 ? "Nenhum pedido ainda" : "Nenhum resultado"}
          description={
            (orders.data ?? []).length === 0
              ? "Os pedidos de recrutamento, sites, mentorias, produtos digitais e palestras ficarão listados aqui."
              : "Ajuste a pesquisa ou os filtros para encontrar o pedido desejado."
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Pedido</Th>
              <Th>Cliente</Th>
              <Th>Serviço</Th>
              <Th>Situação</Th>
              <Th>Pagamento</Th>
              <Th>Prioridade</Th>
              <Th>Responsável</Th>
              <Th>Prazo</Th>
              <Th>Valor</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <Td>
                  <span className="font-bold text-primary">{o.order_number}</span>
                  <span className="block text-xs text-muted-foreground">{o.title}</span>
                </Td>
                <Td>{customerName(o.customer_id)}</Td>
                <Td>{labelOf(SERVICE_TYPES, o.service_type)}</Td>
                <Td>
                  <StatusBadge tone={toneOf(ORDER_STATUSES, o.status)}>
                    {labelOf(ORDER_STATUSES, o.status)}
                  </StatusBadge>
                </Td>
                <Td>
                  <StatusBadge tone={toneOf(PAYMENT_STATUSES, o.payment_status)}>
                    {labelOf(PAYMENT_STATUSES, o.payment_status)}
                  </StatusBadge>
                </Td>
                <Td>
                  <StatusBadge tone={toneOf(PRIORITIES, o.priority)}>
                    {labelOf(PRIORITIES, o.priority)}
                  </StatusBadge>
                </Td>
                <Td>{memberName(o.assignee_id)}</Td>
                <Td>{formatDate(o.due_date)}</Td>
                <Td>{formatMoney(o.amount_cents, o.currency)}</Td>
                <Td>
                  <GhostButton
                    className="!px-3 !py-1.5"
                    onClick={() => setSelectedId(selectedId === o.id ? null : o.id)}
                  >
                    {selectedId === o.id ? "Fechar" : "Abrir"}
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
            <h2 className="font-serif text-xl">
              {selected.order_number} — {selected.title}
            </h2>
            <GhostButton onClick={() => setSelectedId(null)}>Fechar</GhostButton>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Criado em {formatDateTime(selected.created_at)} • atualizado em{" "}
            {formatDateTime(selected.updated_at)}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Situação">
              <select
                className="s8-field"
                value={selected.status}
                onChange={(e) =>
                  updateOrder.mutate({
                    id: selected.id,
                    patch: { status: e.target.value as OrderStatus },
                  })
                }
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pagamento">
              <select
                className="s8-field"
                value={selected.payment_status}
                onChange={(e) =>
                  updateOrder.mutate({
                    id: selected.id,
                    patch: { payment_status: e.target.value as PaymentStatus },
                  })
                }
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridade">
              <select
                className="s8-field"
                value={selected.priority}
                onChange={(e) =>
                  updateOrder.mutate({
                    id: selected.id,
                    patch: { priority: e.target.value as PriorityLevel },
                  })
                }
              >
                {PRIORITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsável">
              <select
                className="s8-field"
                value={selected.assignee_id ?? ""}
                onChange={(e) =>
                  updateOrder.mutate({
                    id: selected.id,
                    patch: { assignee_id: e.target.value || null },
                  })
                }
              >
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
            <Field label="Prazo">
              <input
                type="date"
                className="s8-field"
                defaultValue={selected.due_date ?? ""}
                onBlur={(e) =>
                  updateOrder.mutate({
                    id: selected.id,
                    patch: { due_date: e.target.value || null },
                  })
                }
              />
            </Field>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Descrição/resumo">
              <textarea
                rows={4}
                className="s8-field"
                defaultValue={selected.description ?? ""}
                onBlur={(e) =>
                  updateOrder.mutate({
                    id: selected.id,
                    patch: { description: e.target.value || null },
                  })
                }
              />
            </Field>
            <Field label="Observações internas">
              <textarea
                rows={4}
                className="s8-field"
                defaultValue={selected.internal_notes ?? ""}
                onBlur={(e) =>
                  updateOrder.mutate({
                    id: selected.id,
                    patch: { internal_notes: e.target.value || null },
                  })
                }
              />
            </Field>
          </div>

          <h3 className="mt-4 font-serif text-lg">Histórico de alterações</h3>
          {(history.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="border-b border-border/60 pb-2 last:border-0">
                  <span className="font-bold">{h.field}</span>
                  {h.old_value ? ` : ${h.old_value} → ` : ": "}
                  <span>{h.new_value ?? "—"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {h.actor_email ?? "sistema"} • {formatDateTime(h.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
