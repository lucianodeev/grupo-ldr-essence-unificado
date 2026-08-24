import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/central/ui";
import { SessionList } from "@/components/cliente/session-list";
import {
  DELIVERY_STATUSES,
  MENTORSHIP_STATUSES,
  ORDER_STATUSES,
  formatDate,
  formatDateTime,
  labelOf,
  toneOf,
} from "@/lib/central";
import { useClientOverview } from "@/lib/client-portal-data";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/_clientarea/cliente/")({
  head: () => ({
    meta: [
      { title: "Minha área — Grupo LDR Essence" },
      {
        name: "description",
        content: "Resumo dos seus pedidos, mentorias, sessões e entregas na Grupo LDR Essence.",
      },
      { property: "og:title", content: "Minha área — Grupo LDR Essence" },
      { property: "og:description", content: "Acompanhe seus pedidos, mentorias e entregas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientHome,
});

const OPEN_ORDER = new Set(["novo", "em_analise", "em_andamento", "aguardando_cliente", "em_revisao"]);

function ClientHome() {
  const { data, isLoading } = useClientOverview();
  const { t } = useI18n();

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Não foi possível carregar seus dados.</p>;

  const openOrders = data.orders.filter((o) => OPEN_ORDER.has(o.status));
  const waitingClient = data.orders.filter((o) => o.status === "aguardando_cliente");
  const pendingApproval = data.deliveries.filter(
    (d) => d.needs_client_approval && (d.status === "entregue" || d.status === "em_revisao"),
  );
  const doneDeliveries = data.deliveries.filter(
    (d) => d.status === "aprovada" || d.status === "entregue",
  );
  const nextSessions = data.sessions
    .filter((s) => s.status === "agendada" && s.scheduled_at && new Date(s.scheduled_at) >= new Date())
    .slice(0, 3);
  const activeMentorship = data.mentorships.find(
    (m) => m.status !== "concluida" && m.status !== "cancelada",
  );

  return (
    <div>
      <PageHeader
        title={`Olá, ${data.customer.fullName.split(" ")[0]}`}
        subtitle="Acompanhe aqui tudo o que está em andamento com a nossa equipe."
      />

      <section className="s8-card mb-6 !p-4" aria-label={t("training.title")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg text-primary">{t("training.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("training.description")}</p>
          </div>
          <a
            href="https://lucianoempreendendor.com/#plataforma"
            target="_blank"
            rel="noreferrer noopener external"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("training.cta")}
          </a>
        </div>
      </section>


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pedidos em andamento" value={openOrders.length} tone="info" />
        <StatCard label="Aguardando você" value={waitingClient.length} tone="gold" />
        <StatCard label="Entregas para aprovar" value={pendingApproval.length} tone="gold" />
        <StatCard label="Entregas concluídas" value={doneDeliveries.length} tone="success" />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-serif text-xl">Meus pedidos</h2>
          {data.orders.length ? (
            <ul className="grid gap-2">
              {data.orders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link
                    to="/cliente/pedido/$orderId"
                    params={{ orderId: o.id }}
                    className="s8-card !p-4 block hover:bg-accent"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-primary">{o.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.order_number} · {formatDate(o.created_at)}
                        </p>
                      </div>
                      <StatusBadge tone={toneOf(ORDER_STATUSES, o.status)}>
                        {labelOf(ORDER_STATUSES, o.status)}
                      </StatusBadge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhum pedido ainda"
              description="Assim que um pedido for registrado pela nossa equipe, ele aparecerá aqui."
            />
          )}
        </div>

        <div>
          <h2 className="mb-2 font-serif text-xl">Mentoria</h2>
          {activeMentorship ? (
            <div className="s8-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">
                  {activeMentorship.program_name ?? "Programa de mentoria"}
                </p>
                <StatusBadge tone={toneOf(MENTORSHIP_STATUSES, activeMentorship.status)}>
                  {labelOf(MENTORSHIP_STATUSES, activeMentorship.status)}
                </StatusBadge>
              </div>
              {activeMentorship.client_summary ? (
                <p className="mt-2 whitespace-pre-wrap text-sm">{activeMentorship.client_summary}</p>
              ) : null}
              <Link to="/cliente/mentoria" className="mt-3 inline-block text-sm font-semibold text-primary underline">
                Ver mentoria
              </Link>
            </div>
          ) : (
            <EmptyState
              title="Sem mentoria ativa"
              description="Quando um programa de mentoria for contratado, os detalhes aparecerão aqui."
            />
          )}

          <h2 className="mt-5 mb-2 font-serif text-xl">Próximas sessões</h2>
          {nextSessions.length ? (
            <SessionList sessions={nextSessions} />
          ) : (
            <EmptyState
              title="Nenhuma sessão agendada"
              description="As sessões agendadas pela equipe aparecem aqui com o link da videochamada."
            />
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-serif text-xl">Entregas aguardando sua aprovação</h2>
        {pendingApproval.length ? (
          <ul className="grid gap-2">
            {pendingApproval.map((d) => (
              <li key={d.id} className="s8-card !p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-primary">{d.title}</p>
                  <StatusBadge tone={toneOf(DELIVERY_STATUSES, d.status)}>
                    {labelOf(DELIVERY_STATUSES, d.status)}
                  </StatusBadge>
                </div>
                <Link to="/cliente/entregas" className="mt-2 inline-block text-sm font-semibold text-primary underline">
                  Revisar entrega
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nada pendente"
            description="Você não tem entregas aguardando aprovação no momento."
          />
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-serif text-xl">Histórico recente</h2>
        {data.history.length ? (
          <ul className="grid gap-2">
            {data.history.map((h) => (
              <li key={h.id} className="s8-card !p-4 text-sm">
                <p className="font-semibold text-primary">{h.note ?? h.field}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sem atualizações" description="As atualizações dos seus pedidos aparecerão aqui." />
        )}
      </section>
    </div>
  );
}
