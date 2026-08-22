import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  PageHeader,
  StatusBadge,
  TableWrap,
  Td,
  Th,
} from "@/components/central/ui";
import { BILLING_MODEL_LABELS, CATEGORY_LABELS } from "@/lib/catalog";
import { setCatalogActive } from "@/lib/catalog.functions";
import { formatMoney, safeUrl } from "@/lib/central";
import { useAccess, useCatalogAll } from "@/lib/central-data";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/painel-profissional/catalogo")({
  component: CatalogPage,
});

function PayLink({ url, label }: { url: string | null; label: string }) {
  const safe = safeUrl(url);
  if (!safe) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      className="font-bold text-primary underline"
      href={safe}
      target="_blank"
      rel="noreferrer noopener"
    >
      {label}
    </a>
  );
}

function CatalogPage() {
  const { t } = useI18n();
  const catalog = useCatalogAll();
  const access = useAccess();
  const queryClient = useQueryClient();
  const toggleFn = useServerFn(setCatalogActive);
  const isSuperadmin = access.data?.role === "superadmin";

  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const toggleActive = useMutation({
    // A escrita acontece só no servidor, sob verificação de superadmin.
    mutationFn: (input: { catalogKey: string; active: boolean }) => toggleFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-catalog-all"] });
      queryClient.invalidateQueries({ queryKey: ["service-catalog"] });
      toast.success(t("catalog.updated"));
    },
    onError: (e: Error) => toast.error(e.message || t("state.denied")),
  });

  const categories = useMemo(
    () => Array.from(new Set((catalog.data ?? []).map((c) => c.category))).sort(),
    [catalog.data],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (catalog.data ?? []).filter((c) => {
      if (category && c.category !== category) return false;
      if (!term) return true;
      return `${c.name} ${c.catalog_key}`.toLowerCase().includes(term);
    });
  }, [catalog.data, category, search]);

  return (
    <div>
      <PageHeader title={t("catalog.title")} subtitle={t("catalog.subtitle")} />

      <div className="s8-card mb-4 grid gap-3 sm:grid-cols-2">
        <Field label={t("action.search")} htmlFor="q">
          <input
            id="q"
            className="s8-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label={t("catalog.category")} htmlFor="cat">
          <select
            id="cat"
            className="s8-field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t("action.all")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("state.empty")} description={t("catalog.subtitle")} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>{t("catalog.service")}</Th>
              <Th>{t("catalog.category")}</Th>
              <Th>{t("catalog.billing")}</Th>
              <Th>{t("catalog.cadence")}</Th>
              <Th>{t("catalog.sessions")}</Th>
              <Th>{t("catalog.amount")}</Th>
              <Th>{t("catalog.payment")}</Th>
              <Th>{t("catalog.repeat")}</Th>
              <Th>{t("catalog.status")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.catalog_key}>
                <Td>
                  <span className="font-bold">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c.catalog_key}</span>
                </Td>
                <Td>{CATEGORY_LABELS[c.category] ?? c.category}</Td>
                <Td>{BILLING_MODEL_LABELS[c.billing_model] ?? c.billing_model}</Td>
                <Td>
                  {c.billing_cadence === "monthly" ? t("catalog.monthly") : t("catalog.oneTime")}
                </Td>
                <Td>{c.package_sessions || "—"}</Td>
                <Td>{formatMoney(c.amount_cents, c.currency)}</Td>
                <Td>
                  <PayLink url={c.payment_url ?? null} label={t("catalog.link")} />
                </Td>
                <Td>
                  <PayLink url={c.repeat_payment_url} label={t("catalog.link")} />
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={c.active ? "success" : "neutral"}>
                      {c.active ? t("catalog.active") : t("catalog.inactive")}
                    </StatusBadge>
                    {isSuperadmin && (
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-60"
                        disabled={toggleActive.isPending}
                        onClick={() =>
                          toggleActive.mutate({ catalogKey: c.catalog_key, active: !c.active })
                        }
                      >
                        {c.active ? t("catalog.deactivate") : t("catalog.activate")}
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
