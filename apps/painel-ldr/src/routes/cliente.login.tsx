import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cliente/login")({
  head: () => ({
    meta: [
      { title: "Área do Cliente — Grupo LDR Essence" },
      {
        name: "description",
        content:
          "Acesse sua área de cliente da Grupo LDR Essence para acompanhar pedidos, mentoria, sessões e entregas.",
      },
      { property: "og:title", content: "Área do Cliente — Grupo LDR Essence" },
      {
        property: "og:description",
        content: "Acompanhe seus pedidos, mentorias e entregas em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientLogin,
});

function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/cliente", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível entrar. Verifique seus dados.");
      return;
    }
    navigate({ to: "/cliente", replace: true });
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/cliente/login`,
    });
    setBusy(false);
    if ("error" in result && result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) navigate({ to: "/cliente", replace: true });
  }

  return (
    <ClientAuthShell title="Área do Cliente" subtitle="Acompanhe seus pedidos, mentorias e entregas.">
      <form onSubmit={handleSignIn}>
        <label className="s8-label" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="s8-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="s8-label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="s8-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Aguarde…" : "Entrar"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-bold text-primary hover:bg-accent disabled:opacity-60"
      >
        Entrar com Google
      </button>

      <p className="mt-6 text-sm">
        <Link to="/cliente/ativar" className="font-semibold text-primary underline">
          Primeiro acesso ou esqueci minha senha
        </Link>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Use o mesmo e-mail informado na sua compra.{" "}
        <Link to="/" className="underline">
          Voltar ao início
        </Link>
      </p>
    </ClientAuthShell>
  );
}

export function ClientAuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header
        className="text-primary-foreground shadow-[var(--shadow-header)]"
        style={{ background: "linear-gradient(135deg, var(--wine-deep), var(--wine))" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <p className="font-serif text-xl leading-tight sm:text-2xl">Grupo LDR Essence</p>
          <p className="text-sm opacity-85">Área do Cliente</p>
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6">
        <section className="s8-card">
          <h1 className="font-serif text-2xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-4">{children}</div>
        </section>
      </main>
    </div>
  );
}
