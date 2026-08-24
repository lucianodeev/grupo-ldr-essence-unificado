import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  GhostButton,
  PageHeader,
  PrimaryButton,
  StatusBadge,
  TableWrap,
  Td,
  Th,
} from "@/components/central/ui";
import { supabase } from "@/integrations/supabase/client";
import {
  DELIVERY_STATUSES,
  MENTORSHIP_STATUSES,
  ORDER_STATUSES,
  formatDate,
  formatDateTime,
  labelOf,
  toneOf,
} from "@/lib/central";
import {
  useCustomers,
  useDeliveries,
  useMentorships,
  useOrders,
} from "@/lib/central-data";

export const Route = createFileRoute("/_authenticated/painel-profissional/clientes")({
  component: CustomersPage,
});

function CustomersPage() {
  const queryClient = useQueryClient();
  const customers = useCustomers();
  const orders = useOrders();
  const mentorships = useMentorships();
  const deliveries = useDeliveries();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const createCustomer = useMutation({
    mutationFn: async (form: FormData) => {
      const v = (k: string) => String(form.get(k) ?? "").trim();
      const email = v("email").toLowerCase();
      if (email && (customers.data ?? []).some((c) => (c.email ?? "").toLowerCase() === email)) {
        throw new Error("Já existe um cliente com este e-mail.");
      }
      const { error } = await supabase.from("customers").insert({
        full_name: v("full_name"),
        email: email || null,
        phone: v("phone") || null,
        country: v("country") || null,
        language: v("language") || null,
        source: v("source") || null,
        notes: v("notes") || null,
      });
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "Já existe um cliente com este e-mail."
            : "Não foi possível salvar o cliente.",
        );
      }
    },
    onSuccess: () => {
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente cadastrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers.data ?? [];
    return (customers.data ?? []).filter((c) =>
      [c.full_name, c.email, c.phone, c.country, c.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [customers.data, search]);

  const open = (customers.data ?? []).find((c) => c.id === openId) ?? null;
  const openOrders = (orders.data ?? []).filter((o) => o.customer_id === openId);
  const openMentorships = (mentorships.data ?? []).filter((m) => m.customer_id === openId);
  const openDeliveries = (deliveries.data ?? []).filter((d) =>
    openOrders.some((o) => o.id === d.order_id),
  );

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro unificado dos clientes do ecossistema."
        actions={
          <PrimaryButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Fechar" : "Novo cliente"}
          </PrimaryButton>
        }
      />

      {creating && (
        <form
          className="s8-card mb-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createCustomer.mutate(new FormData(e.currentTarget));
          }}
        >
          <Field label="Nome" htmlFor="full_name">
            <input id="full_name" name="full_name" className="s8-field" required />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <input id="email" name="email" type="email" className="s8-field" />
          </Field>
          <Field label="Telefone" htmlFor="phone">
            <input id="phone" name="phone" className="s8-field" />
          </Field>
          <Field label="País" htmlFor="country">
            <input id="country" name="country" className="s8-field" />
          </Field>
          <Field label="Idioma" htmlFor="language">
            <input id="language" name="language" placeholder="pt-BR" className="s8-field" />
          </Field>
          <Field label="Origem" htmlFor="source">
            <input id="source" name="source" placeholder="site, indicação…" className="s8-field" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observações" htmlFor="notes">
              <textarea id="notes" name="notes" rows={3} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <PrimaryButton type="submit" disabled={createCustomer.isPending}>
              Salvar cliente
            </PrimaryButton>
            <GhostButton onClick={() => setCreating(false)}>Cancelar</GhostButton>
          </div>
        </form>
      )}

      <div className="s8-card mb-4">
        <Field label="Pesquisar" htmlFor="q">
          <input
            id="q"
            className="s8-field"
            placeholder="Nome, e-mail, telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Cadastre clientes para vincular pedidos, mentorias e entregas ao histórico correto."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Contato</Th>
              <Th>País / Idioma</Th>
              <Th>Origem</Th>
              <Th>Pedidos</Th>
              <Th>Mentorias</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <Td>
                  <span className="font-bold">{c.full_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    desde {formatDate(c.created_at)}
                  </span>
                </Td>
                <Td>
                  {c.email ?? "—"}
                  <span className="block text-xs text-muted-foreground">{c.phone ?? ""}</span>
                </Td>
                <Td>
                  {c.country ?? "—"} {c.language ? `• ${c.language}` : ""}
                </Td>
                <Td>{c.source ?? "—"}</Td>
                <Td>{(orders.data ?? []).filter((o) => o.customer_id === c.id).length}</Td>
                <Td>{(mentorships.data ?? []).filter((m) => m.customer_id === c.id).length}</Td>
                <Td>
                  <GhostButton
                    className="!px-3 !py-1.5"
                    onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  >
                    {openId === c.id ? "Fechar" : "Detalhes"}
                  </GhostButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {open && (
        <section className="s8-card mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl">{open.full_name}</h2>
            <GhostButton onClick={() => setOpenId(null)}>Fechar</GhostButton>
          </div>
          {open.notes ? <p className="mt-2 text-sm">{open.notes}</p> : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <h3 className="font-serif text-lg">Pedidos</h3>
              {openOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem pedidos.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {openOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2">
                      <span>{o.order_number}</span>
                      <StatusBadge tone={toneOf(ORDER_STATUSES, o.status)}>
                        {labelOf(ORDER_STATUSES, o.status)}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg">Mentorias</h3>
              {openMentorships.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem mentorias.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {openMentorships.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={toneOf(MENTORSHIP_STATUSES, m.status)}>
                        {labelOf(MENTORSHIP_STATUSES, m.status)}
                      </StatusBadge>
                      {m.participant_id ? (
                        <Link
                          to="/painel-profissional/s8"
                          search={{ participante: m.participant_id }}
                          className="text-xs font-bold text-primary underline"
                        >
                          Abrir S8
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg">Entregas</h3>
              {openDeliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem entregas.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {openDeliveries.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <span>{d.title}</span>
                      <StatusBadge tone={toneOf(DELIVERY_STATUSES, d.status)}>
                        {labelOf(DELIVERY_STATUSES, d.status)}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <h3 className="mt-4 font-serif text-lg">Histórico de atividade</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Cadastro criado em {formatDateTime(open.created_at)}</li>
            {openOrders.map((o) => (
              <li key={o.id}>
                Pedido {o.order_number} • atualizado em {formatDateTime(o.updated_at)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
