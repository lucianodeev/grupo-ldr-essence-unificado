import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/central/ui";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUSES,
  SERVICE_TYPES,
  formatDateTime,
  labelOf,
  toneOf,
} from "@/lib/central";
import {
  useCustomers,
  useDeliveries,
  useMentorships,
  useOrders,
  useRecentActivity,
} from "@/lib/central-data";

export const Route = createFileRoute("/_authenticated/painel-profissional/")({
  component: Overview,
});

function Overview() {
  const orders = useOrders();
  const customers = useCustomers();
  const mentorships = useMentorships();
  const deliveries = useDeliveries();
  const activity = useRecentActivity();

  const list = orders.data ?? [];
  const count = (fn: (o: (typeof list)[number]) => boolean) => list.filter(fn).length;

  const byService = SERVICE_TYPES.map((s) => ({
    ...s,
    total: count((o) => o.service_type === s.value),
  })).filter((s) => s.total > 0);

  const mentoriasAtivas = (mentorships.data ?? []).filter((m) =>
    ["agendada", "em_andamento", "aguardando_agendamento"].includes(m.status),
  ).length;
  const entregasPendentes = (deliveries.data ?? []).filter(
    (d) => d.status !== "entregue" && d.status !== "cancelada",
  ).length;

  return (
    <div>
      <PageHeader
        title="Visão geral"
        subtitle="Panorama operacional da Grupo LDR Essence."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Pedidos" value={list.length} tone="info" />
        <StatCard label="Novos" value={count((o) => o.status === "novo")} tone="info" />
        <StatCard
          label="Em andamento"
          value={count((o) => o.status === "em_andamento")}
          tone="gold"
        />
        <StatCard
          label="Aguardando cliente"
          value={count((o) => o.status === "aguardando_cliente")}
          tone="neutral"
        />
        <StatCard label="Concluídos" value={count((o) => o.status === "concluido")} tone="success" />
        <StatCard label="Cancelados" value={count((o) => o.status === "cancelado")} tone="danger" />
        <StatCard label="Clientes" value={(customers.data ?? []).length} tone="gold" />
        <StatCard
          label="Mentorias ativas"
          value={mentoriasAtivas}
          hint={`${(mentorships.data ?? []).length} no total`}
          tone="info"
        />
        <StatCard label="Entregas pendentes" value={entregasPendentes} tone="gold" />
        <StatCard
          label="Pedidos abertos"
          value={count((o) => ACTIVE_ORDER_STATUSES.includes(o.status))}
          tone="info"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="s8-card">
          <h2 className="font-serif text-xl">Pedidos por tipo de serviço</h2>
          {byService.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum pedido registrado até o momento.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {byService.map((s) => (
                <li key={s.value}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <span className="font-bold text-primary">{s.total}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full" style={{ background: "var(--muted)" }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.round((s.total / list.length) * 100)}%`,
                        background: "linear-gradient(90deg, var(--wine), var(--gold))",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="s8-card">
          <h2 className="font-serif text-xl">Atividade recente</h2>
          {(activity.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              As alterações de pedidos e entregas aparecerão aqui.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {(activity.data ?? []).map((h) => (
                <li key={h.id} className="border-b border-border/60 pb-2 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{h.field}</span>
                    {h.new_value ? (
                      <StatusBadge tone="info">{h.new_value}</StatusBadge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(h.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {h.actor_email ?? "sistema"}
                    {h.old_value ? ` • antes: ${h.old_value}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {list.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Ainda não há pedidos na central"
            description="Cadastre o primeiro pedido para começar a acompanhar prazos, responsáveis e entregas."
            action={
              <Link
                to="/painel-profissional/pedidos"
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Ir para Pedidos
              </Link>
            }
          />
        </div>
      ) : (
        <section className="mt-4 s8-card">
          <h2 className="font-serif text-xl">Últimos pedidos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {list.slice(0, 6).map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
              >
                <span>
                  <span className="font-bold text-primary">{o.order_number}</span> — {o.title}
                </span>
                <StatusBadge tone={toneOf(ORDER_STATUSES, o.status)}>
                  {labelOf(ORDER_STATUSES, o.status)}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
