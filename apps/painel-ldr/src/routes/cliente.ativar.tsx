import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { activateClientAccess } from "@/lib/client-portal.functions";
import { ClientAuthShell } from "./cliente.login";

export const Route = createFileRoute("/cliente/ativar")({
  head: () => ({
    meta: [
      { title: "Primeiro acesso — Área do Cliente | Grupo LDR Essence" },
      {
        name: "description",
        content: "Ative o acesso à sua área de cliente da Grupo LDR Essence com segurança.",
      },
      { property: "og:title", content: "Primeiro acesso — Área do Cliente" },
      { property: "og:description", content: "Ative seu acesso usando o e-mail da compra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivatePage,
});

function ActivatePage() {
  const activate = useServerFn(activateClientAccess);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await activate({ data: { email: email.trim().toLowerCase() } });
    } catch {
      /* resposta sempre genérica */
    }
    setBusy(false);
    setSent(true);
    toast.success("Se este e-mail estiver cadastrado, você receberá as instruções em instantes.");
  }

  return (
    <ClientAuthShell
      title="Primeiro acesso"
      subtitle="Informe o mesmo e-mail usado na sua compra. Enviaremos um link seguro para você definir sua senha. Você também pode entrar com o Google usando esse mesmo e-mail."
    >
      {sent ? (
        <div className="s8-notice">
          <p className="text-sm">
            Se este e-mail estiver cadastrado, enviamos um link para definir sua senha. Verifique
            também a caixa de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="s8-label" htmlFor="email">
            E-mail da compra
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
          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Enviando…" : "Enviar link de acesso"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm">
        <Link to="/cliente/login" className="font-semibold text-primary underline">
          Voltar para o login
        </Link>
      </p>
    </ClientAuthShell>
  );
}
