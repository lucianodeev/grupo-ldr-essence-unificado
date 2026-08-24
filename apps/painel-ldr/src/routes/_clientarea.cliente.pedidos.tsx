import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader, StatusBadge } from "@/components/central/ui";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
  formatDate,
  formatMoney,
  labelOf,
  toneOf,
} from "@/lib/central";
import { useClientOverview } from "@/lib/client-portal-data";

export const Route = createFileRoute("/_clientarea/cliente/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Grupo LDR Essence" },
      { name: "description", content: "Acompanhe o andamento de todos os seus pedidos." },
      { property: "og:title", content: "Meus pedidos — Grupo LDR Essence" },
      { property: "og:description", content: "Status, prazos e entregas dos seus pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientOrders,
});

function ClientOrders() {
  const { data, isLoading } = useClientOverview();
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const orders = data?.orders ?? [];

  return (
    <div>
      <PageHeader title="Meus pedidos" subtitle="Todos os serviços contratados com a LDR." />
      {orders.length ? (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to="/cliente/pedido/$orderId"
                params={{ orderId: o.id }}
                className="s8-card block hover:bg-accent"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg">{o.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {o.order_number} · {labelOf(SERVICE_TYPES, o.service_type)} ·{" "}
                      {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={toneOf(ORDER_STATUSES, o.status)}>
                      {labelOf(ORDER_STATUSES, o.status)}
                    </StatusBadge>
                    <StatusBadge tone={toneOf(PAYMENT_STATUSES, o.payment_status)}>
                      {labelOf(PAYMENT_STATUSES, o.payment_status)}
                    </StatusBadge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Prazo: {formatDate(o.due_date)} · Valor:{" "}
                  {formatMoney(o.amount_cents, o.currency)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nenhum pedido"
          description="Assim que um pedido for registrado pela nossa equipe, ele aparecerá aqui."
        />
      )}
    </div>
  );
}
