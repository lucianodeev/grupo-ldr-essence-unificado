import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Definir nova senha — Sistema S8 | Grupo LDR Essence" },
      { name: "description", content: "Definição de nova senha para contas do Sistema S8." },
      { property: "og:title", content: "Definir nova senha — Sistema S8" },
      { property: "og:description", content: "Redefinição de senha de acesso profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      setReady(isRecovery || Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 12) {
      toast.error("A senha deve ter ao menos 12 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/painel-profissional" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <section className="s8-card">
          <h1 className="font-serif text-2xl">Definir nova senha</h1>
          {!ready ? (
            <div className="s8-notice mt-4 text-sm">
              Abra esta página pelo link enviado por e-mail para redefinir sua senha.
            </div>
          ) : (
            <form className="mt-2" onSubmit={handleSubmit}>
              <label className="s8-label" htmlFor="new-password">
                Nova senha (mínimo 12 caracteres)
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="s8-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="s8-label" htmlFor="confirm-password">
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="s8-field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Aguarde…" : "Salvar nova senha"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
