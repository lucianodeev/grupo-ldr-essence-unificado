import { createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader } from "@/components/central/ui";
import { SessionList } from "@/components/cliente/session-list";
import { useClientMentorship } from "@/lib/client-portal-data";

export const Route = createFileRoute("/_clientarea/cliente/sessoes")({
  head: () => ({
    meta: [
      { title: "Minhas sessões — Grupo LDR Essence" },
      { name: "description", content: "Agenda das suas sessões com link de videochamada." },
      { property: "og:title", content: "Minhas sessões — Grupo LDR Essence" },
      { property: "og:description", content: "Datas, duração e link de videochamada das sessões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientSessions,
});

function ClientSessions() {
  const { data, isLoading } = useClientMentorship();
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const sessions = data?.sessions ?? [];
  const upcoming = sessions.filter((s) => s.status === "agendada");
  const past = sessions.filter((s) => s.status !== "agendada");

  return (
    <div>
      <PageHeader title="Sessões" subtitle="Sua agenda e os links de videochamada." />
      <h2 className="mb-2 font-serif text-xl">Próximas</h2>
      {upcoming.length ? (
        <SessionList sessions={upcoming} />
      ) : (
        <EmptyState
          title="Nenhuma sessão agendada"
          description="Assim que uma sessão for marcada, ela aparecerá aqui com o link de acesso."
        />
      )}
      <h2 className="mt-6 mb-2 font-serif text-xl">Anteriores</h2>
      {past.length ? (
        <SessionList sessions={past} />
      ) : (
        <EmptyState title="Sem histórico" description="Ainda não há sessões realizadas." />
      )}
    </div>
  );
}
