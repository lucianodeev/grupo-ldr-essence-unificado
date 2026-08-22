import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/access.functions";
import { useAccess } from "@/lib/central-data";
import { LanguageSelect } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/painel-profissional")({
  head: () => ({
    meta: [
      { title: "Central de Operação — Grupo LDR Essence" },
      {
        name: "description",
        content:
          "Central interna de operação da Grupo LDR Essence: pedidos, mentorias, Sistema S8, clientes, equipe e entregas.",
      },
      { property: "og:title", content: "Central de Operação — Grupo LDR Essence" },
      { property: "og:description", content: "Área restrita para profissionais autorizados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CentralLayout,
});

const NAV = [
  { to: "/painel-profissional", label: "Visão geral", exact: true },
  { to: "/painel-profissional/pedidos", label: "Pedidos" },
  { to: "/painel-profissional/agenda", label: "Agenda" },
  { to: "/painel-profissional/mentoria", label: "Mentoria" },
  { to: "/painel-profissional/s8", label: "Sistema S8" },
  { to: "/painel-profissional/clientes", label: "Clientes" },
  { to: "/painel-profissional/equipe", label: "Equipe" },
  { to: "/painel-profissional/entregas", label: "Entregas" },
  { to: "/painel-profissional/catalogo", label: "Catálogo" },
] as const;

function CentralLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logEvent = useServerFn(logAuthEvent);
  const access = useAccess();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    try {
      await logEvent({ data: { action: "logout" } });
    } catch {
      /* auditoria não deve bloquear a saída */
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (access.isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="s8-card mx-auto max-w-md text-center">Verificando permissões…</div>
      </div>
    );
  }

  if (!access.data?.authorized) {
    return (
      <div className="min-h-screen p-6">
        <div className="s8-card mx-auto max-w-md text-center">
          <h1 className="font-serif text-3xl">403</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta não possui autorização para acessar esta central. Solicite liberação ao
            administrador.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-5 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const isSuperadmin = access.data.role === "superadmin";
  const items = isSuperadmin
    ? [
        ...NAV,
        { to: "/painel-profissional/psicanalise", label: "Psicanálise" } as const,
        { to: "/painel-profissional/acessos", label: "Gestão de acessos" } as const,
      ]
    : NAV;

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className="no-print sticky top-0 z-30 lg:h-screen lg:w-64 lg:shrink-0"
        style={{
          background: "linear-gradient(160deg, var(--wine-deep), var(--wine))",
          color: "var(--primary-foreground)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
          <div>
            <p className="font-serif text-lg leading-tight">Grupo LDR Essence</p>
            <p className="text-xs opacity-80">Central de Operação</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/30 px-3 py-2 text-sm font-bold lg:hidden"
            aria-expanded={menuOpen}
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
        </div>

        <nav
          className={`${menuOpen ? "block" : "hidden"} px-3 pb-4 lg:block`}
          aria-label="Menu principal"
        >
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: "exact" in item ? item.exact : false }}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
                  activeProps={{
                    className:
                      "block rounded-lg px-3 py-2.5 text-sm font-bold bg-secondary text-secondary-foreground",
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-white/20 pt-4">
            <LanguageSelect />
          </div>

          <div className="mt-5 border-t border-white/20 pt-4 text-xs">
            <p className="font-bold">{access.data.fullName ?? access.data.email}</p>
            <p className="opacity-80">perfil {access.data.role}</p>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 w-full rounded-lg border border-white/30 px-3 py-2 text-sm font-bold"
            >
              Sair
            </button>
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
