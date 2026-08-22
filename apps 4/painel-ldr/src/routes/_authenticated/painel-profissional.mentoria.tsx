import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  Field,
  GhostButton,
  PageHeader,
  PrimaryButton,
  StatusBadge,
} from "@/components/central/ui";
import { MentorshipSessions } from "@/components/central/mentorship-sessions";
import { supabase } from "@/integrations/supabase/client";
import {
  MENTORSHIP_STATUSES,
  PAYMENT_STATUSES,
  formatDateTime,
  labelOf,
  toLocalInput,
  toneOf,
} from "@/lib/central";
import type { MentorshipStatus, PaymentStatus } from "@/lib/central";
import {
  useCustomers,
  useMentorships,
  useParticipants,
  type Mentorship,
} from "@/lib/central-data";

export const Route = createFileRoute("/_authenticated/painel-profissional/mentoria")({
  component: MentoriaPage,
});

function MentoriaPage() {
  const queryClient = useQueryClient();
  const mentorships = useMentorships();
  const customers = useCustomers();
  const participants = useParticipants();
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | MentorshipStatus>("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mentorships"] });

  const createMentorship = useMutation({
    mutationFn: async (form: FormData) => {
      const v = (k: string) => String(form.get(k) ?? "").trim();
      let customerId = v("customer_id") || null;
      if (!customerId) {
        const { data, error: cErr } = await supabase
          .from("customers")
          .insert({ full_name: v("contact_name"), email: v("contact_email") || null })
          .select("id")
          .single();
        if (cErr) throw new Error("Não foi possível cadastrar o cliente da mentoria.");
        customerId = data.id;
      }
      const { error } = await supabase.from("mentorships").insert({
        customer_id: customerId,
        participant_id: v("participant_id") || null,
        goal: v("goal") || null,
        intake_answers: v("intake_answers") || null,
        status: (v("status") || "intake") as MentorshipStatus,
        payment_status: (v("payment_status") || "pendente") as PaymentStatus,
        scheduled_at: v("scheduled_at") ? new Date(v("scheduled_at")).toISOString() : null,
        notes: v("notes") || null,
      });
      if (error) throw new Error("Não foi possível criar a mentoria.");
    },
    onSuccess: () => {
      setCreating(false);
      invalidate();
      toast.success("Mentoria registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Mentorship> }) => {
      const { error } = await supabase.from("mentorships").update(patch).eq("id", id);
      if (error) throw new Error("Não foi possível atualizar a mentoria.");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Mentoria atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const customerOf = (id: string | null) =>
    (customers.data ?? []).find((c) => c.id === id) ?? null;

  const linkParticipant = useMutation({
    mutationFn: async (m: Mentorship) => {
      const c = customerOf(m.customer_id);
      const { data, error } = await supabase
        .from("participants")
        .insert({ full_name: c?.full_name ?? "Participante de mentoria", email: c?.email ?? null })
        .select("id")
        .single();
      if (error) throw new Error("Não foi possível criar o participante do S8.");
      const { error: upErr } = await supabase
        .from("mentorships")
        .update({ participant_id: data.id })
        .eq("id", m.id);
      if (upErr) throw new Error("Participante criado, mas não foi possível vincular.");
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      toast.success("Participante S8 vinculado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (mentorships.data ?? []).filter((m) => !statusFilter || m.status === statusFilter);

  return (
    <div>
      <PageHeader
        title="Mentoria"
        subtitle="Fluxo completo: intake → pagamento → agendamento → sessões S8."
        actions={
          <PrimaryButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Fechar" : "Nova mentoria"}
          </PrimaryButton>
        }
      />

      <ol className="s8-card mb-4 flex flex-wrap gap-2 text-xs">
        {["Formulário inicial", "Pagamento", "Agendamento", "Confirmação", "Sessões S8"].map(
          (step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full font-bold"
                style={{ background: "var(--gold-soft)", color: "var(--accent-foreground)" }}
              >
                {i + 1}
              </span>
              <span className="font-semibold">{step}</span>
            </li>
          ),
        )}
      </ol>

      {creating && (
        <form
          className="s8-card mb-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMentorship.mutate(new FormData(e.currentTarget));
          }}
        >
          <Field label="Nome do cliente (se novo)" htmlFor="contact_name">
            <input id="contact_name" name="contact_name" className="s8-field" />
          </Field>
          <Field label="E-mail (se novo)" htmlFor="contact_email">
            <input id="contact_email" name="contact_email" type="email" className="s8-field" />
          </Field>
          <Field label="Cliente cadastrado" htmlFor="customer_id">
            <select id="customer_id" name="customer_id" className="s8-field">
              <option value="">— sem vínculo —</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Participante S8" htmlFor="participant_id">
            <select id="participant_id" name="participant_id" className="s8-field">
              <option value="">— criar depois —</option>
              {(participants.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Objetivo da mentoria" htmlFor="goal">
            <input id="goal" name="goal" className="s8-field" />
          </Field>
          <Field label="Status da mentoria" htmlFor="status">
            <select id="status" name="status" className="s8-field">
              {MENTORSHIP_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pagamento" htmlFor="payment_status">
            <select id="payment_status" name="payment_status" className="s8-field">
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agendamento" htmlFor="scheduled_at">
            <input id="scheduled_at" name="scheduled_at" type="datetime-local" className="s8-field" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Respostas do formulário inicial" htmlFor="intake_answers">
              <textarea id="intake_answers" name="intake_answers" rows={4} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observações" htmlFor="notes">
              <textarea id="notes" name="notes" rows={2} className="s8-field" />
            </Field>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <PrimaryButton type="submit" disabled={createMentorship.isPending}>
              Salvar mentoria
            </PrimaryButton>
            <GhostButton onClick={() => setCreating(false)}>Cancelar</GhostButton>
          </div>
        </form>
      )}

      <div className="s8-card mb-4 max-w-xs">
        <Field label="Filtrar por status" htmlFor="f-status">
          <select
            id="f-status"
            className="s8-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MentorshipStatus | "")}
          >
            <option value="">Todos</option>
            {MENTORSHIP_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhuma mentoria registrada"
          description="Ao receber um novo pedido de mentoria, registre aqui o intake, o pagamento e o agendamento da primeira sessão."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((m) => (
            <article key={m.id} className="s8-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-lg">
                  {customerOf(m.customer_id)?.full_name ?? "Cliente não vinculado"}
                </h2>
                <StatusBadge tone={toneOf(MENTORSHIP_STATUSES, m.status)}>
                  {labelOf(MENTORSHIP_STATUSES, m.status)}
                </StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground">
                {customerOf(m.customer_id)?.email ?? "sem e-mail"} • criada em {formatDateTime(m.created_at)}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Status da mentoria">
                  <select
                    className="s8-field"
                    value={m.status}
                    onChange={(e) =>
                      update.mutate({
                        id: m.id,
                        patch: { status: e.target.value as MentorshipStatus },
                      })
                    }
                  >
                    {MENTORSHIP_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pagamento">
                  <select
                    className="s8-field"
                    value={m.payment_status}
                    onChange={(e) =>
                      update.mutate({
                        id: m.id,
                        patch: { payment_status: e.target.value as PaymentStatus },
                      })
                    }
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Agendamento">
                  <input
                    type="datetime-local"
                    className="s8-field"
                    defaultValue={toLocalInput(m.scheduled_at)}
                    onBlur={(e) =>
                      update.mutate({
                        id: m.id,
                        patch: {
                          scheduled_at: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Programa contratado (visível ao cliente)">
                  <input
                    className="s8-field"
                    defaultValue={m.program_name ?? ""}
                    onBlur={(e) =>
                      update.mutate({ id: m.id, patch: { program_name: e.target.value || null } })
                    }
                  />
                </Field>
                <Field label="Resumo para o cliente">
                  <textarea
                    rows={2}
                    className="s8-field"
                    defaultValue={m.client_summary ?? ""}
                    onBlur={(e) =>
                      update.mutate({ id: m.id, patch: { client_summary: e.target.value || null } })
                    }
                  />
                </Field>
                <Field label="Próximos passos (visível ao cliente)">
                  <textarea
                    rows={2}
                    className="s8-field"
                    defaultValue={m.next_steps ?? ""}
                    onBlur={(e) =>
                      update.mutate({ id: m.id, patch: { next_steps: e.target.value || null } })
                    }
                  />
                </Field>
                <Field label="Observações internas">
                  <textarea
                    rows={2}
                    className="s8-field"
                    defaultValue={m.notes ?? ""}
                    onBlur={(e) =>
                      update.mutate({ id: m.id, patch: { notes: e.target.value || null } })
                    }
                  />
                </Field>
              </div>

              <MentorshipSessions mentorshipId={m.id} />

              {m.intake_answers ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-bold text-primary">
                    Respostas do formulário inicial
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">{m.intake_answers}</p>
                </details>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {m.participant_id ? (
                  <Link
                    to="/painel-profissional/s8"
                    search={{ participante: m.participant_id }}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    Abrir Sistema S8
                  </Link>
                ) : (
                  <GhostButton
                    disabled={linkParticipant.isPending}
                    onClick={() => linkParticipant.mutate(m)}
                  >
                    Criar e vincular participante S8
                  </GhostButton>
                )}
                {m.status === "agendada" ? (
                  <span className="self-center text-xs text-muted-foreground">
                    Cliente confirmado — aguarde a sessão em {formatDateTime(m.scheduled_at)}.
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
