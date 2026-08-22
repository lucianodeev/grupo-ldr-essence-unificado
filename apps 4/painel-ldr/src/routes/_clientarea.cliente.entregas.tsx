import { createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader } from "@/components/central/ui";
import { DeliveryCard } from "@/components/cliente/delivery-card";
import { useClientDeliveries } from "@/lib/client-portal-data";

export const Route = createFileRoute("/_clientarea/cliente/entregas")({
  head: () => ({
    meta: [
      { title: "Minhas entregas — Grupo LDR Essence" },
      { name: "description", content: "Materiais entregues, aprovação e solicitação de ajustes." },
      { property: "og:title", content: "Minhas entregas — Grupo LDR Essence" },
      { property: "og:description", content: "Aprove entregas ou solicite ajustes à equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientDeliveries,
});

function ClientDeliveries() {
  const { data, isLoading } = useClientDeliveries();
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const deliveries = data?.deliveries ?? [];
  const orders = data?.orders ?? [];
  const events = data?.events ?? [];

  const pending = deliveries.filter(
    (d) => d.needs_client_approval && (d.status === "entregue" || d.status === "em_revisao"),
  );
  const others = deliveries.filter((d) => !pending.includes(d));

  const orderLabel = (orderId: string | null) => {
    const order = orders.find((o) => o.id === orderId);
    return order ? `${order.order_number} · ${order.title}` : null;
  };

  return (
    <div>
      <PageHeader title="Entregas" subtitle="Revise, aprove ou solicite ajustes nos materiais." />

      <h2 className="mb-2 font-serif text-xl">Aguardando sua aprovação</h2>
      {pending.length ? (
        <div className="grid gap-3">
          {pending.map((d) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              events={events.filter((e) => e.delivery_id === d.id)}
              orderLabel={orderLabel(d.order_id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Nada pendente" description="Você não tem entregas aguardando aprovação." />
      )}

      <h2 className="mt-6 mb-2 font-serif text-xl">Todas as entregas</h2>
      {others.length ? (
        <div className="grid gap-3">
          {others.map((d) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              events={events.filter((e) => e.delivery_id === d.id)}
              orderLabel={orderLabel(d.order_id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma entrega"
          description="Os materiais liberados pela equipe aparecerão aqui."
        />
      )}
    </div>
  );
}
