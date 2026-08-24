import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/central/ui";
import { supabase } from "@/integrations/supabase/client";
import { useClientContext, useUpdateClientProfile } from "@/lib/client-portal-data";

export const Route = createFileRoute("/_clientarea/cliente/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Grupo LDR Essence" },
      { name: "description", content: "Atualize seus dados de contato e a senha de acesso." },
      { property: "og:title", content: "Meu perfil — Grupo LDR Essence" },
      { property: "og:description", content: "Dados de contato e segurança da sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientProfile,
});

function ClientProfile() {
  const { data } = useClientContext();
  const update = useUpdateClientProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const customer = data?.status === "ok" ? data.customer : null;

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName);
      setPhone(customer.phone ?? "");
    }
  }, [customer]);

  async function handlePasswordReset() {
    if (!customer?.email) return;
    await supabase.auth.resetPasswordForEmail(customer.email, {
      redirectTo: `${window.location.origin}/cliente/definir-senha`,
    });
    toast.success("Enviamos um link para você redefinir sua senha.");
  }

  return (
    <div>
      <PageHeader title="Meu perfil" subtitle="Seus dados de contato e acesso." />
      <section className="s8-card max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({ fullName, phone: phone.trim() || null });
          }}
        >
          <label className="s8-label" htmlFor="fullName">
            Nome completo
          </label>
          <input
            id="fullName"
            className="s8-field"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <label className="s8-label" htmlFor="phone">
            Telefone
          </label>
          <input
            id="phone"
            className="s8-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label className="s8-label" htmlFor="email">
            E-mail (não editável)
          </label>
          <input id="email" className="s8-field" value={customer?.email ?? ""} disabled readOnly />

          <button
            type="submit"
            disabled={update.isPending}
            className="mt-5 rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {update.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <h2 className="font-serif text-lg">Segurança</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviaremos um link seguro para o seu e-mail para você definir uma nova senha.
          </p>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-bold text-primary hover:bg-accent"
          >
            Redefinir senha
          </button>
        </div>
      </section>
    </div>
  );
}
