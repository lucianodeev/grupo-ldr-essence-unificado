import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { ClientAuthShell } from "./cliente.login";

export const Route = createFileRoute("/cliente/definir-senha")({
  head: () => ({
    meta: [
      { title: "Definir senha — Área do Cliente | Grupo LDR Essence" },
      { name: "description", content: "Defina a senha de acesso à sua área de cliente." },
      { property: "og:title", content: "Definir senha — Área do Cliente" },
      { property: "og:description", content: "Crie sua senha de acesso com segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => setReady(isRecovery || Boolean(data.session)));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use ao menos 8 caracteres.");
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
      toast.error("Não foi possível definir a senha. Solicite um novo link.");
      return;
    }
    toast.success("Senha definida com sucesso.");
    navigate({ to: "/cliente", replace: true });
  }

  return (
    <ClientAuthShell title="Definir senha" subtitle="Escolha uma senha para acessar sua área.">
      {ready ? (
        <form onSubmit={handleSubmit}>
          <label className="s8-label" htmlFor="password">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            className="s8-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="s8-label" htmlFor="confirm">
            Repetir senha
          </label>
          <input
            id="confirm"
            type="password"
            required
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
            {busy ? "Salvando…" : "Salvar senha"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Abra esta página pelo link enviado ao seu e-mail para definir a senha.
        </p>
      )}
    </ClientAuthShell>
  );
}
