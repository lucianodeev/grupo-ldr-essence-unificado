import { createFileRoute } from "@tanstack/react-router";

import {
  EmptyState,
  PageHeader,
  StatusBadge,
  TableWrap,
  Td,
  Th,
} from "@/components/central/ui";
import { ACTIVE_ORDER_STATUSES } from "@/lib/central";
import { useOrders, useTeam } from "@/lib/central-data";

export const Route = createFileRoute("/_authenticated/painel-profissional/equipe")({
  component: TeamPage,
});

function TeamPage() {
  const team = useTeam();
  const orders = useOrders();

  const members = team.data ?? [];
  const list = orders.data ?? [];

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle="Visão operacional dos colaboradores autorizados e da carga de trabalho. A criação e a remoção de credenciais permanecem em Gestão de acessos."
      />

      {members.length === 0 ? (
        <EmptyState
          title="Nenhum colaborador autorizado"
          description="Os acessos são criados pelo superadmin na área Gestão de acessos."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Colaborador</Th>
              <Th>E-mail</Th>
              <Th>Perfil</Th>
              <Th>Situação</Th>
              <Th>Pedidos atribuídos</Th>
              <Th>Carga atual</Th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const assigned = list.filter((o) => o.assignee_id === m.id);
              const load = assigned.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length;
              return (
                <tr key={m.id}>
                  <Td>{m.fullName ?? "—"}</Td>
                  <Td>{m.email}</Td>
                  <Td>
                    <StatusBadge tone={m.role === "superadmin" ? "gold" : "info"}>
                      {m.role === "superadmin" ? "Superadmin" : "Colaborador"}
                    </StatusBadge>
                  </Td>
                  <Td>
                    <StatusBadge tone={m.isActive ? "success" : "danger"}>
                      {m.isActive ? "Ativo" : "Inativo"}
                    </StatusBadge>
                  </Td>
                  <Td>{assigned.length}</Td>
                  <Td>
                    <StatusBadge tone={load > 4 ? "danger" : load > 0 ? "gold" : "neutral"}>
                      {load} em andamento
                    </StatusBadge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
