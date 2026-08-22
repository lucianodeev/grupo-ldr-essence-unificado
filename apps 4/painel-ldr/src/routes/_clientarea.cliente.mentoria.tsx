import { createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader, StatusBadge } from "@/components/central/ui";
import { SessionList } from "@/components/cliente/session-list";
import {
  MENTORSHIP_STATUSES,
  PAYMENT_STATUSES,
  formatDateTime,
  labelOf,
  toneOf,
} from "@/lib/central";
import { useClientMentorship } from "@/lib/client-portal-data";

export const Route = createFileRoute("/_clientarea/cliente/mentoria")({
  head: () => ({
    meta: [
      { title: "Minha mentoria — Grupo LDR Essence" },
      { name: "description", content: "Programa contratado, sessões e próximos passos da sua mentoria." },
      { property: "og:title", content: "Minha mentoria — Grupo LDR Essence" },
      { property: "og:description", content: "Acompanhe sessões, status e próximos passos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientMentorship,
});

function ClientMentorship() {
  const { data, isLoading } = useClientMentorship();
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const mentorships = data?.mentorships ?? [];
  const sessions = data?.sessions ?? [];

  return (
    <div>
      <PageHeader title="Mentoria" subtitle="Seu programa, sessões e próximos passos." />
      {mentorships.length ? (
        <div className="grid gap-4">
          {mentorships.map((m) => {
            const mSessions = sessions.filter((s) => s.mentorship_id === m.id);
            const upcoming = mSessions.filter((s) => s.status === "agendada");
            const past = mSessions.filter((s) => s.status !== "agendada");
            return (
              <section key={m.id} className="s8-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-xl">{m.program_name ?? "Programa de mentoria"}</h2>
                    <p className="text-xs text-muted-foreground">
                      Início: {formatDateTime(m.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={toneOf(MENTORSHIP_STATUSES, m.status)}>
                      {labelOf(MENTORSHIP_STATUSES, m.status)}
                    </StatusBadge>
                    <StatusBadge tone={toneOf(PAYMENT_STATUSES, m.payment_status)}>
                      Pagamento: {labelOf(PAYMENT_STATUSES, m.payment_status)}
                    </StatusBadge>
                  </div>
                </div>

                {m.client_summary ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm">{m.client_summary}</p>
                ) : null}
                {m.next_steps ? (
                  <div className="s8-notice mt-3">
                    <p className="text-xs font-bold uppercase tracking-wide">Próximos passos</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{m.next_steps}</p>
                  </div>
                ) : null}

                <h3 className="mt-5 mb-2 font-serif text-lg">Próximas sessões</h3>
                {upcoming.length ? (
                  <SessionList sessions={upcoming} />
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma sessão agendada no momento.</p>
                )}

                <h3 className="mt-5 mb-2 font-serif text-lg">Sessões realizadas</h3>
                {past.length ? (
                  <SessionList sessions={past} />
                ) : (
                  <p className="text-sm text-muted-foreground">Ainda não há sessões registradas.</p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma mentoria"
          description="Quando um programa de mentoria for contratado, ele aparecerá aqui."
        />
      )}
    </div>
  );
}
