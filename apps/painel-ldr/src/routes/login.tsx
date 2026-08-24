import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/access.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso profissional — Sistema S8 | Grupo LDR Essence" },
      {
        name: "description",
        content: "Área de autenticação para profissionais autorizados do Sistema S8.",
      },
      { property: "og:title", content: "Acesso profissional — Sistema S8" },
      { property: "og:description", content: "Autenticação restrita a profissionais autorizados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const logEvent = useServerFn(logAuthEvent);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setBusy(false);
      toast.error("Não foi possível entrar. Verifique suas credenciais.");
      return;
    }
    try {
      await logEvent({ data: { action: "auth.login" } });
    } catch {
      /* auditoria não bloqueia o acesso */
    }
    setBusy(false);
    navigate({ to: "/painel-profissional" });
  }

  async function handleRecover(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    toast.success("Se este e-mail estiver cadastrado, você receberá as instruções em instantes.");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6">
        <section className="s8-card">
          <h1 className="font-serif text-2xl">
            {recovering ? "Recuperar senha" : "Acesso profissional"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Área restrita. Cada profissional usa a própria conta — senhas não devem ser
            compartilhadas.
          </p>

          <form className="mt-4" onSubmit={recovering ? handleRecover : handleSignIn}>
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

            {!recovering && (
              <>
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
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Aguarde…" : recovering ? "Enviar instruções" : "Entrar"}
            </button>
          </form>

          <button
            type="button"
            className="mt-4 text-sm font-semibold text-primary underline"
            onClick={() => setRecovering((v) => !v)}
          >
            {recovering ? "Voltar para o login" : "Esqueci minha senha"}
          </button>

          <p className="mt-6 text-xs text-muted-foreground">
            Não possui acesso? Solicite ao superadministrador da Grupo LDR Essence.{" "}
            <Link to="/" className="underline">
              Voltar ao início
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
