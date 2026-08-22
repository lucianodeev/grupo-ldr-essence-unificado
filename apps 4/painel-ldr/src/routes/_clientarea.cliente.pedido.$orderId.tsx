import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader, StatusBadge } from "@/components/central/ui";
import { DeliveryCard } from "@/components/cliente/delivery-card";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
  formatDate,
  formatDateTime,
  formatMoney,
  labelOf,
  toneOf,
} from "@/lib/central";
import { useClientOrder } from "@/lib/client-portal-data";

export const Route = createFileRoute("/_clientarea/cliente/pedido/$orderId")({
  head: () => ({
    meta: [
      { title: "Detalhes do pedido — Grupo LDR Essence" },
      { name: "description", content: "Status, histórico e entregas do seu pedido." },
      { property: "og:title", content: "Detalhes do pedido — Grupo LDR Essence" },
      { property: "og:description", content: "Acompanhe status, prazos e materiais entregues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientOrderDetail,
});

function ClientOrderDetail() {
  const { orderId } = Route.useParams();
  const { data, isLoading, isError } = useClientOrder(orderId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (isError || !data) {
    return (
      <EmptyState
        title="Pedido não encontrado"
        description="Este pedido não está disponível na sua conta."
        action={
          <Link to="/cliente/pedidos" className="font-semibold text-primary underline">
            Voltar aos pedidos
          </Link>
        }
      />
    );
  }

  const { order, deliveries, history, events } = data;
  const finished = order.status === "concluido";

  return (
    <div>
      <PageHeader
        title={order.title}
        subtitle={`${order.order_number} · ${labelOf(SERVICE_TYPES, order.service_type)}`}
        actions={
          <Link to="/cliente/pedidos" className="text-sm font-semibold text-primary underline">
            Voltar
          </Link>
        }
      />

      <section className="s8-card">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={toneOf(ORDER_STATUSES, order.status)}>
            {labelOf(ORDER_STATUSES, order.status)}
          </StatusBadge>
          <StatusBadge tone={toneOf(PAYMENT_STATUSES, order.payment_status)}>
            Pagamento: {labelOf(PAYMENT_STATUSES, order.payment_status)}
          </StatusBadge>
        </div>
        {order.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm">{order.description}</p>
        ) : null}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Data do pedido
            </dt>
            <dd>{formatDate(order.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Prazo previsto
            </dt>
            <dd>{formatDate(order.due_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Valor
            </dt>
            <dd>{formatMoney(order.amount_cents, order.currency)}</dd>
          </div>
        </dl>
        {finished ? (
          <div className="s8-notice mt-4">
            <p className="text-sm">
              <strong>Concluído</strong> — última atualização em {formatDate(order.updated_at)}. Os
              materiais abaixo continuam disponíveis enquanto sua conta estiver ativa.
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-serif text-xl">Meu projeto / entregas</h2>
        {deliveries.length ? (
          <div className="grid gap-3">
            {deliveries.map((d) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                events={events.filter((e) => e.delivery_id === d.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma entrega disponível"
            description="Os materiais entregues aparecerão aqui assim que forem liberados."
          />
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-serif text-xl">Histórico do pedido</h2>
        {history.length ? (
          <ul className="grid gap-2">
            {history.map((h) => (
              <li key={h.id} className="s8-card !p-4 text-sm">
                <p className="font-semibold text-primary">{h.note ?? h.field}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sem atualizações" description="Ainda não há registros neste pedido." />
        )}
      </section>
    </div>
  );
}
