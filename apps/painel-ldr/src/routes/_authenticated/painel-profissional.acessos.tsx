import { createFileRoute } from "@tanstack/react-router";

import { AccessManagement } from "@/components/s8/access-management";
import { PageHeader } from "@/components/central/ui";
import { useAccess } from "@/lib/central-data";

export const Route = createFileRoute("/_authenticated/painel-profissional/acessos")({
  component: AccessPage,
});

function AccessPage() {
  const access = useAccess();

  if (access.isLoading) {
    return <div className="s8-card">Verificando permissões…</div>;
  }

  if (access.data?.role !== "superadmin") {
    return (
      <div className="s8-card text-center">
        <h1 className="font-serif text-3xl">403</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva do superadmin.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Gestão de acessos"
        subtitle="Contas individuais, ativação/desativação, remoção e auditoria."
      />
      <AccessManagement />
    </div>
  );
}
