import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useClientContext } from "@/lib/client-portal-data";
import { LanguageSelect, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_clientarea/cliente")({
  component: ClientShell,
});

const NAV = [
  { to: "/cliente", label: "Início", exact: true },
  { to: "/cliente/contratar", label: "Contratar e agendar", key: "nav.contract" },
  { to: "/cliente/pedidos", label: "Meus pedidos" },
  { to: "/cliente/biblioteca", label: "Biblioteca / Plataforma" },
  { to: "/cliente/agenda", label: "Minha agenda" },
  { to: "/cliente/mentoria", label: "Mentoria" },
  { to: "/cliente/sessoes", label: "Sessões" },
  { to: "/cliente/entregas", label: "Entregas" },
  { to: "/cliente/perfil", label: "Meu perfil" },
] as const;

const WHATSAPP_URL =
  "https://wa.me/32492923605?text=Ola%2C%20preciso%20de%20ajuda%20na%20Area%20do%20Cliente%20do%20Grupo%20LDR%20Essence";
const WEBSITE_URL = "https://ldrrhestrategia.com";

function ClientShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const context = useClientContext();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/cliente/login", replace: true });
  }

  const status = context.data?.status;

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header
        className="sticky top-0 z-30 text-primary-foreground shadow-[var(--shadow-header)]"
        style={{ background: "linear-gradient(135deg, var(--wine-deep), var(--wine))" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-serif text-lg leading-tight sm:text-xl">Grupo LDR Essence</p>
            <p className="text-xs opacity-85">Área do Cliente</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelect className="w-24" />
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-white/30 px-3 py-2 text-xs font-bold hover:bg-white/10"
            >
              Sair
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/30 px-3 py-2 text-xs font-bold hover:bg-white/10 md:hidden"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              Menu
            </button>
          </div>
        </div>
        <nav
          className={`${menuOpen ? "block" : "hidden"} border-t border-white/15 md:block`}
          aria-label="Navegação da área do cliente"
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 sm:px-6 md:flex-row md:gap-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/cliente" }}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold opacity-85 hover:bg-white/10"
                  activeProps={{ className: "bg-white/15 opacity-100" }}
                >
                  {"key" in item ? t(item.key) : item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer noopener external"
                className="block rounded-lg px-3 py-2 text-sm font-semibold opacity-85 hover:bg-white/10"
              >
                {t("support.whatsapp")}
              </a>
            </li>
            <li>
              <a
                href={WEBSITE_URL}
                target="_blank"
                rel="noreferrer noopener external"
                className="block rounded-lg px-3 py-2 text-sm font-semibold opacity-85 hover:bg-white/10"
              >
                {t("support.website")}
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {context.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : status === "ok" ? (
          <Outlet />
        ) : (
          <section className="s8-card">
            <h1 className="font-serif text-2xl">Acesso indisponível</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {status === "blocked"
                ? "Seu acesso está temporariamente desativado. Fale com a equipe da Grupo LDR Essence."
                : "Ainda não localizamos um cadastro de cliente vinculado a este e-mail. Use o mesmo e-mail informado na sua compra ou fale com a nossa equipe."}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Sair
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
