import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, LockKeyhole, ShoppingCart, ReceiptText } from "lucide-react";

import { clientCreateDigitalCheckout, clientDigitalLibrary } from "@/lib/client-portal.functions";

export const Route = createFileRoute("/_clientarea/cliente/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca / Plataforma — Grupo LDR Essence" },
      {
        name: "description",
        content: "Seus livros, e-books e treinamentos digitais em um só lugar.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientLibrary,
});

function money(cents: number, currency: "BRL" | "EUR") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function ClientLibrary() {
  const fn = useServerFn(clientDigitalLibrary);
  const checkoutFn = useServerFn(clientCreateDigitalCheckout);
  const queryClient = useQueryClient();
  const checkout = useMutation({
    mutationFn: (input: { productKey: "ebook_coragem_comecar" | "livro_menino_mamao"; market: "BR" | "INTL" }) =>
      checkoutFn({ data: input }),
    onSuccess: (result) => { window.location.href = result.url; },
  });
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const paymentState = params?.get("payment");

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-digital-library"],
    queryFn: () => fn({}),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando biblioteca…</p>;
  if (error || !data) {
    return (
      <section className="s8-card">
        <h1 className="font-serif text-2xl">Biblioteca / Plataforma</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar sua biblioteca agora. Tente novamente em instantes.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="s8-card">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Grupo LDR Essence</p>
        <h1 className="mt-1 font-serif text-3xl">Biblioteca / Plataforma</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          O login identifica sua conta, mas não libera produtos pagos. Cada item é liberado
          individualmente somente após uma compra confirmada vinculada ao seu cadastro.
        </p>
        <a href="/cliente/pedidos" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary underline">
          <ReceiptText className="h-4 w-4" aria-hidden="true" /> Ver meus pedidos e pagamentos
        </a>
      </section>

      {paymentState === "success" ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong>Pagamento recebido.</strong> Estamos confirmando o pagamento. Seu produto será liberado automaticamente nesta biblioteca.
          <button type="button" className="ml-2 underline font-bold" onClick={() => queryClient.invalidateQueries({ queryKey: ["client-digital-library"] })}>Atualizar acesso</button>
        </section>
      ) : paymentState === "cancel" ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Pagamento cancelado. Nenhum conteúdo foi liberado e você pode tentar novamente quando quiser.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2" aria-label="Produtos digitais">
        {data.products.map((product) => (
          <article key={product.key} className="s8-card flex min-h-[300px] flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl border border-border bg-accent/50 p-3 text-primary">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  product.entitled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {product.entitled ? "Disponível" : "Compra necessária"}
              </span>
            </div>

            <h2 className="mt-5 font-serif text-2xl">{product.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>

            <div className="mt-5 rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Valor de referência
              </p>
              <p className="mt-1 font-bold text-primary">
                Brasil {money(product.priceBrlCents, "BRL")} · Exterior {money(product.priceEurCents, "EUR")}
              </p>
            </div>

            <div className="mt-auto pt-5">
              {product.entitled ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-bold">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Acesso liberado
                  </div>
                  <p className="mt-1 text-xs">
                    Seu direito de acesso foi confirmado. O leitor protegido será conectado nesta área na etapa de conteúdo.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    A leitura permanece bloqueada até a confirmação do pagamento.
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={checkout.isPending}
                      onClick={() => checkout.mutate({ productKey: product.key, market: "BR" })}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-95 disabled:opacity-60"
                    >
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      Comprar Brasil
                    </button>
                    <button
                      type="button"
                      disabled={checkout.isPending}
                      onClick={() => checkout.mutate({ productKey: product.key, market: "INTL" })}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 text-sm font-bold text-primary hover:bg-accent disabled:opacity-60"
                    >
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      Comprar exterior
                    </button>
                  </div>
                  {checkout.isError ? (
                    <p className="mt-2 text-xs font-semibold text-destructive">Não foi possível abrir o checkout. Tente novamente.</p>
                  ) : null}
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
