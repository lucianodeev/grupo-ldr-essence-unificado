import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SiteHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header
      className="no-print sticky top-0 z-20 text-primary-foreground shadow-[var(--shadow-header)]"
      style={{
        background: "linear-gradient(135deg, var(--wine-deep), var(--wine))",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div>
          <p className="font-serif text-xl leading-tight text-primary-foreground sm:text-2xl">
            Painel Profissional — Sistema S8 / Mentoria
          </p>
          <p className="text-sm opacity-85">
            Grupo LDR Essence • 8 sessões individuais • 50 minutos • PDE final
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <HeaderLink to="/">Início</HeaderLink>
          <HeaderLink to="/formulario">Formulário</HeaderLink>
          <HeaderLink to="/cliente">Área do cliente</HeaderLink>
          <HeaderLink to="/painel-profissional">Painel</HeaderLink>

          {actions}
        </nav>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-opacity hover:opacity-90"
    >
      {children}
    </Link>
  );
}
