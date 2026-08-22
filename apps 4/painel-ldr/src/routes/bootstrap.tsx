import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { bootstrapStatus, runBootstrap } from "@/lib/access.functions";

export const Route = createFileRoute("/bootstrap")({
  head: () => ({
    meta: [
      { title: "Configuração inicial — Sistema S8 | Grupo LDR Essence" },
      { name: "description", content: "Criação única da conta de administração do Sistema S8." },
      { property: "og:title", content: "Configuração inicial — Sistema S8" },
      { property: "og:description", content: "Fluxo de uso único protegido no servidor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Bootstrap,
});

function Bootstrap() {
  const navigate = useNavigate();
  const status = useServerFn(bootstrapStatus);
  const submit = useServerFn(runBootstrap);
  const [secret, setSecret] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const open = useQuery({ queryKey: ["bootstrap-status"], queryFn: () => status({}) });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 12) {
      toast.error("A senha deve ter ao menos 12 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await submit({ data: { secret, email, password, fullName } });
      toast.success("Superadmin criado. Faça login para continuar.");
      navigate({ to: "/login" });
    } catch {
      toast.error("Não foi possível concluir a configuração inicial.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <section className="s8-card">
          <h1 className="font-serif text-2xl">Configuração inicial</h1>
          {open.data?.open === false ? (
            <div className="s8-notice mt-4 text-sm">
              A configuração inicial já foi concluída e está permanentemente encerrada.
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Fluxo de uso único. O segredo é validado no servidor e nunca fica no navegador.
              </p>
              <form className="mt-2" onSubmit={handleSubmit}>
                <label className="s8-label" htmlFor="secret">
                  Segredo de bootstrap
                </label>
                <input
                  id="secret"
                  type="password"
                  required
                  className="s8-field"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                />
                <label className="s8-label" htmlFor="bootstrap-name">
                  Nome completo
                </label>
                <input
                  id="bootstrap-name"
                  required
                  className="s8-field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <label className="s8-label" htmlFor="bootstrap-email">
                  E-mail
                </label>
                <input
                  id="bootstrap-email"
                  type="email"
                  required
                  className="s8-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label className="s8-label" htmlFor="bootstrap-password">
                  Senha (mínimo 12 caracteres)
                </label>
                <input
                  id="bootstrap-password"
                  type="password"
                  required
                  className="s8-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? "Criando…" : "Criar superadmin"}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
