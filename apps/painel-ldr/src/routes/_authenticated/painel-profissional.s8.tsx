import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PageHeader } from "@/components/central/ui";
import { S8Panel } from "@/components/s8/panel";

const searchSchema = z.object({
  participante: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/painel-profissional/s8")({
  validateSearch: searchSchema,
  component: S8Module,
});

function S8Module() {
  const { participante } = Route.useSearch();
  return (
    <div>
      <PageHeader
        title="Sistema S8"
        subtitle="8 sessões individuais de 50 minutos, projeto de negócio, PDE e relatório final."
      />
      <S8Panel participantId={participante ?? null} />
    </div>
  );
}
