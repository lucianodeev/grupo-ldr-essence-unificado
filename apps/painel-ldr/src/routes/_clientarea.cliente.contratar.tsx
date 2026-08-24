import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Field, PageHeader } from "@/components/central/ui";
import { useClientContractCatalog } from "@/lib/client-portal-data";
import { formatMoney, safeUrl } from "@/lib/central";
import type { ContractItem } from "@/lib/contract-catalog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_clientarea/cliente/contratar")({
  head: () => ({
    meta: [
      { title: "Contratar e agendar — Grupo LDR Essence" },
      {
        name: "description",
        content: "Compre sessões e pacotes e agende seu atendimento na Área do Cliente.",
      },
      { property: "og:title", content: "Contratar e agendar — Grupo LDR Essence" },
      {
        property: "og:description",
        content: "Sessões avulsas e pacotes de Psicanálise e Mentoria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientContract,
});

function payLink(item: ContractItem): string | null {
  const url = safeUrl(item.paymentUrl);
  return url;
}

function ClientContract() {
  const { t } = useI18n();
  const catalog = useClientContractCatalog();
  const [region, setRegion] = useState<"eu" | "br">("eu");

  const items = catalog.data?.items ?? [];
  const psicanalise = items.filter((i) => i.group === "psicanalise");
  const mentoria = items.filter((i) => i.group === "mentoria");

  const psicByRegion = (r: "eu" | "br") => psicanalise.filter((i) => i.region === r);

  if (catalog.isLoading)
    return <p className="text-sm text-muted-foreground">{t("state.loading")}</p>;

  const Card = ({ item }: { item: ContractItem }) => {
    const link = payLink(item);
    return (
      <li className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg leading-snug">{item.name}</h3>
            <p className="mt-1 text-sm font-bold text-primary">
              {item.sessions} {item.sessions === 1 ? t("contract.session") : t("contract.sessions")}
            </p>
            {item.originalCents !== null && (
              <span className="mt-2 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                {t("contract.discount")}
              </span>
            )}
          </div>
          <div className="text-right">
            {item.originalCents ? (
              <>
                <p className="text-sm text-muted-foreground line-through">
                  {formatMoney(item.originalCents, item.currency)}
                </p>
                <p className="text-lg font-extrabold text-primary">
                  {formatMoney(item.amountCents, item.currency)}
                </p>
              </>
            ) : (
              <p className="text-lg font-extrabold">
                {formatMoney(item.amountCents, item.currency)}
              </p>
            )}
          </div>
        </div>

        {link ? (
          <a
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={link}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("contract.buy")}
          </a>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">{t("contract.unavailable")}</p>
        )}
      </li>
    );
  };

  return (
    <div className="grid gap-6">
      <PageHeader title={t("contract.title")} subtitle={t("contract.subtitle")} />

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <ol className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <span>{t("contract.step1")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <span>{t("contract.step2")}</span>
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">{t("contract.afterPayment")}</p>
        <button
          type="button"
          onClick={() => catalog.refetch()}
          disabled={catalog.isRefetching}
          className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent disabled:opacity-60"
        >
          {t("contract.refresh")}
        </button>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-2xl">{t("contract.psychoanalysis")}</h2>
          <Field label={t("contract.region")} htmlFor="contract-region">
            <select
              id="contract-region"
              className="s8-field"
              value={region}
              onChange={(e) => setRegion(e.target.value as "eu" | "br")}
            >
              <option value="eu">Europa — EUR</option>
              <option value="br">Brasil — BRL</option>
            </select>
          </Field>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {psicByRegion(region).map((i) => (
            <Card key={i.catalogKey} item={i} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl">{t("contract.mentorship")}</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {mentoria.map((i) => (
            <Card key={i.catalogKey} item={i} />
          ))}
        </ul>
      </section>
    </div>
  );
}
