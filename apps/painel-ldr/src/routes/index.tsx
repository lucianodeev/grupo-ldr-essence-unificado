import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grupo LDR Essence — Sistema S8" },
      {
        name: "description",
        content:
          "Metodologia S8 da Grupo LDR Essence: 8 sessões individuais de mentoria com projeto de negócio e Plano de Desenvolvimento (PDE).",
      },
      { property: "og:title", content: "Grupo LDR Essence — Sistema S8" },
      {
        property: "og:description",
        content: "8 sessões individuais de mentoria, projeto de negócio e PDE final.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="s8-card">
          <h1 className="font-serif text-3xl">Sistema S8 / Mentoria</h1>
          <p className="mt-3 max-w-3xl text-[0.98rem]">
            Um percurso de oito encontros individuais de 50 minutos, conduzido pela LDR RH &amp;
            Estratégia, que estrutura o projeto de negócio do participante e conclui com um Plano de
            Desenvolvimento (PDE) personalizado.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/formulario"
              className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground"
            >
              Quero participar
            </Link>
            <Link
              to="/painel-profissional"
              className="rounded-lg border border-border bg-card px-5 py-3 font-bold text-primary"
            >
              Acesso profissional
            </Link>
          </div>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="s8-card">
            <h2 className="font-serif text-xl">Como funciona</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>8 sessões individuais com escala de evolução de 0 a 10;</li>
              <li>registro profissional de respostas, observações e tarefas;</li>
              <li>construção do projeto de negócio ao longo do percurso;</li>
              <li>relatório final e PDE entregues na oitava sessão.</li>
            </ul>
          </div>
          <div className="s8-card">
            <h2 className="font-serif text-xl">Confidencialidade</h2>
            <p className="mt-3 text-sm">
              Os registros das sessões são confidenciais. O painel profissional é restrito a
              profissionais autorizados, com conta individual e intransferível — conhecer o endereço
              da página não dá acesso a nenhum dado.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
