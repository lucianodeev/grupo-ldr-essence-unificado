import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SessionTimer } from "@/components/s8/session-timer";
import { supabase } from "@/integrations/supabase/client";
import { PDE_FIELDS, PROJECT_FIELDS, S8_SESSIONS } from "@/lib/s8-content";

type Participant = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  birth_date: string | null;
  business_stage: string | null;
  business_area: string | null;
  goal: string | null;
  notes: string | null;
};

type SessionRow = {
  id?: string;
  participant_id: string;
  session_number: number;
  scale: number | null;
  main_answers: string | null;
  professional_notes: string | null;
  task: string | null;
  completed: boolean;
  session_date: string | null;
  duration_seconds: number;
};

type RecordMap = Record<string, string | null>;

function emptySession(participantId: string, n: number): SessionRow {
  return {
    participant_id: participantId,
    session_number: n,
    scale: null,
    main_answers: "",
    professional_notes: "",
    task: "",
    completed: false,
    session_date: null,
    duration_seconds: 0,
  };
}

export function S8Panel({ participantId }: { participantId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(participantId ?? null);
  const [newName, setNewName] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const participants = useQuery({
    queryKey: ["participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw new Error("Não foi possível carregar os participantes.");
      return (data ?? []) as Participant[];
    },
  });

  useEffect(() => {
    if (participantId) setSelectedId(participantId);
  }, [participantId]);

  useEffect(() => {
    if (!selectedId && participants.data?.length) {
      setSelectedId(participants.data[0]!.id);
    }
  }, [participants.data, selectedId]);


  const participant = participants.data?.find((p) => p.id === selectedId) ?? null;

  const sessions = useQuery({
    queryKey: ["sessions", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("s8_sessions")
        .select("*")
        .eq("participant_id", selectedId!)
        .order("session_number");
      if (error) throw new Error("Não foi possível carregar as sessões.");
      return (data ?? []) as SessionRow[];
    },
  });

  const project = useQuery({
    queryKey: ["project", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const { data } = await supabase
        .from("business_projects")
        .select("*")
        .eq("participant_id", selectedId!)
        .maybeSingle();
      return (data ?? {}) as RecordMap;
    },
  });

  const pde = useQuery({
    queryKey: ["pde", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const { data } = await supabase
        .from("pde_records")
        .select("*")
        .eq("participant_id", selectedId!)
        .maybeSingle();
      return (data ?? {}) as RecordMap;
    },
  });

  const createParticipant = useMutation({
    mutationFn: async (name: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("participants")
        .insert({ full_name: name, created_by: auth.user?.id ?? null })
        .select("id")
        .single();
      if (error) throw new Error("Não foi possível criar o participante.");
      return data.id as string;
    },
    onSuccess: (id) => {
      setNewName("");
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      toast.success("Participante criado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sessionsByNumber = useMemo(() => {
    const map = new Map<number, SessionRow>();
    (sessions.data ?? []).forEach((s) => map.set(s.session_number, s));
    return map;
  }, [sessions.data]);

  const completedCount = (sessions.data ?? []).filter((s) => s.completed).length;

  if (participants.isError) {
    return (
      <div className="s8-card">
        <h2 className="font-serif text-xl">Dados indisponíveis</h2>
        <p className="mt-2 text-sm">Não foi possível carregar os dados com esta conta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="s8-card no-print">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="s8-label" htmlFor="participant-select">
              Participante
            </label>
            <select
              id="participant-select"
              className="s8-field"
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              <option value="">— selecione —</option>
              {(participants.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <form
            className="flex flex-1 flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) createParticipant.mutate(newName.trim());
            }}
          >
            <div className="min-w-[200px] flex-1">
              <label className="s8-label" htmlFor="new-participant">
                Novo participante
              </label>
              <input
                id="new-participant"
                className="s8-field"
                placeholder="Nome completo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-secondary px-4 py-3 font-bold text-secondary-foreground"
            >
              Adicionar
            </button>
          </form>
        </div>
      </section>

      {!participant ? (
        <section className="s8-card">
          <h2 className="font-serif text-xl">Nenhum participante selecionado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie um participante para iniciar o acompanhamento das 8 sessões.
          </p>
        </section>
      ) : (
        <>
          <ParticipantForm participant={participant} />

          <section className="s8-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl">Progresso das 8 sessões</h2>
              <span
                className="rounded-full px-3 py-1 text-xs font-extrabold"
                style={{ background: "var(--gold-soft)", color: "var(--accent-foreground)" }}
              >
                {completedCount} de 8 concluídas
              </span>
            </div>
            <div className="mt-3 h-3.5 overflow-hidden rounded-lg bg-muted">
              <div
                className="h-full transition-all"
                style={{ width: `${(completedCount / 8) * 100}%`, background: "var(--gold)" }}
              />
            </div>
          </section>

          {S8_SESSIONS.map((def) => (
            <SessionCard
              key={def.number}
              def={def}
              row={sessionsByNumber.get(def.number) ?? emptySession(participant.id, def.number)}
            />
          ))}

          <FieldsCard
            title="Projeto de Negócio"
            table="business_projects"
            participantId={participant.id}
            fields={PROJECT_FIELDS}
            values={project.data ?? {}}
            queryKey={["project", participant.id]}
          />

          <FieldsCard
            title="PDE — Plano de Desenvolvimento"
            table="pde_records"
            participantId={participant.id}
            fields={PDE_FIELDS}
            values={pde.data ?? {}}
            queryKey={["pde", participant.id]}
          />

          <ReportCard
            participant={participant}
            sessions={sessions.data ?? []}
            project={project.data ?? {}}
            pde={pde.data ?? {}}
          />

          <section className="s8-card no-print">
            <h2 className="font-serif text-xl">Exportar e importar dados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Disponível apenas para profissionais autorizados. Trate o arquivo como material
              confidencial.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground"
                onClick={() => {
                  const payload = {
                    exported_at: new Date().toISOString(),
                    participant,
                    sessions: sessions.data ?? [],
                    business_project: project.data ?? {},
                    pde: pde.data ?? {},
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `s8-${participant.full_name.replace(/\s+/g, "-").toLowerCase()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportar JSON
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-card px-4 py-2 font-bold text-primary"
                onClick={() => importRef.current?.click()}
              >
                Importar JSON
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    const parsed = JSON.parse(await file.text());
                    await importPayload(participant.id, parsed);
                    queryClient.invalidateQueries();
                    toast.success("Dados importados para o participante selecionado.");
                  } catch {
                    toast.error("Arquivo inválido ou importação não permitida.");
                  }
                }}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

async function importPayload(participantId: string, parsed: unknown) {
  const payload = parsed as {
    sessions?: SessionRow[];
    business_project?: RecordMap;
    pde?: RecordMap;
  };

  if (Array.isArray(payload.sessions)) {
    const rows = payload.sessions
      .filter((s) => Number(s.session_number) >= 1 && Number(s.session_number) <= 8)
      .map((s) => ({
        participant_id: participantId,
        session_number: Number(s.session_number),
        scale: s.scale ?? null,
        main_answers: s.main_answers ?? null,
        professional_notes: s.professional_notes ?? null,
        task: s.task ?? null,
        completed: Boolean(s.completed),
        session_date: s.session_date ?? null,
        duration_seconds: Number(s.duration_seconds ?? 0),
      }));
    if (rows.length) {
      const { error } = await supabase
        .from("s8_sessions")
        .upsert(rows, { onConflict: "participant_id,session_number" });
      if (error) throw error;
    }
  }

  if (payload.business_project) {
    const values = pick(payload.business_project, PROJECT_FIELDS.map((f) => f.key));
    const { error } = await supabase
      .from("business_projects")
      .upsert({ participant_id: participantId, ...values }, { onConflict: "participant_id" });
    if (error) throw error;
  }

  if (payload.pde) {
    const values = pick(payload.pde, PDE_FIELDS.map((f) => f.key));
    const { error } = await supabase
      .from("pde_records")
      .upsert({ participant_id: participantId, ...values }, { onConflict: "participant_id" });
    if (error) throw error;
  }
}

function pick(source: RecordMap, keys: string[]) {
  const out: RecordMap = {};
  keys.forEach((key) => {
    if (typeof source[key] === "string" || source[key] === null) out[key] = source[key] ?? null;
  });
  return out;
}

function ParticipantForm({ participant }: { participant: Participant }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(participant);

  useEffect(() => setForm(participant), [participant]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("participants")
        .update({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          birth_date: form.birth_date || null,
          business_stage: form.business_stage,
          business_area: form.business_area,
          goal: form.goal,
          notes: form.notes,
        })
        .eq("id", participant.id);
      if (error) throw new Error("Não foi possível salvar a ficha.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      toast.success("Ficha salva.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function set<K extends keyof Participant>(key: K, value: Participant[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="s8-card">
      <h2 className="font-serif text-2xl">Ficha do participante</h2>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Nome completo">
          <input
            className="s8-field"
            value={form.full_name ?? ""}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            className="s8-field"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Telefone">
          <input
            className="s8-field"
            value={form.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label="Cidade">
          <input
            className="s8-field"
            value={form.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
        <Field label="Data de nascimento">
          <input
            type="date"
            className="s8-field"
            value={form.birth_date ?? ""}
            onChange={(e) => set("birth_date", e.target.value)}
          />
        </Field>
        <Field label="Momento do negócio">
          <select
            className="s8-field"
            value={form.business_stage ?? ""}
            onChange={(e) => set("business_stage", e.target.value)}
          >
            <option value="">— selecione —</option>
            <option value="ideia">Ideia</option>
            <option value="validacao">Validação</option>
            <option value="operando">Já operando</option>
            <option value="expansao">Expansão</option>
          </select>
        </Field>
        <Field label="Área de atuação">
          <input
            className="s8-field"
            value={form.business_area ?? ""}
            onChange={(e) => set("business_area", e.target.value)}
          />
        </Field>
        <Field label="Objetivo nas 8 sessões">
          <input
            className="s8-field"
            value={form.goal ?? ""}
            onChange={(e) => set("goal", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações gerais">
            <textarea
              className="s8-field min-h-24"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      </div>
      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="no-print mt-4 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
      >
        {save.isPending ? "Salvando…" : "Salvar ficha"}
      </button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="s8-label">{label}</span>
      {children}
    </div>
  );
}

function SessionCard({
  def,
  row,
}: {
  def: { number: number; title: string; prompt: string };
  row: SessionRow;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(row);
  const [open, setOpen] = useState(false);

  useEffect(() => setForm(row), [row]);

  const save = useMutation({
    mutationFn: async (override?: Partial<SessionRow>) => {
      const payload = { ...form, ...override };
      const { error } = await supabase.from("s8_sessions").upsert(
        {
          participant_id: payload.participant_id,
          session_number: payload.session_number,
          scale: payload.scale,
          main_answers: payload.main_answers,
          professional_notes: payload.professional_notes,
          task: payload.task,
          completed: payload.completed,
          session_date: payload.session_date || null,
          duration_seconds: payload.duration_seconds,
        },
        { onConflict: "participant_id,session_number" },
      );
      if (error) throw new Error("Não foi possível salvar a sessão.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", row.participant_id] });
      toast.success(`Sessão ${def.number} salva.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="s8-card" style={{ borderLeft: "5px solid var(--wine)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl">
            Sessão {def.number} — {def.title}
          </h2>
          <p className="text-sm text-muted-foreground">{def.prompt}</p>
        </div>
        <div className="flex items-center gap-2">
          {form.completed && (
            <span
              className="rounded-full px-3 py-1 text-xs font-extrabold"
              style={{ background: "var(--gold-soft)", color: "var(--accent-foreground)" }}
            >
              concluída
            </span>
          )}
          <button
            type="button"
            className="no-print rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-primary"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Recolher" : "Abrir"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <Field label={`Escala de evolução: ${form.scale ?? 0} / 10`}>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                className="w-full"
                value={form.scale ?? 0}
                onChange={(e) => setForm({ ...form, scale: Number(e.target.value) })}
              />
            </Field>
            <Field label="Respostas principais">
              <textarea
                className="s8-field min-h-28"
                value={form.main_answers ?? ""}
                onChange={(e) => setForm({ ...form, main_answers: e.target.value })}
              />
            </Field>
            <Field label="Observações profissionais">
              <textarea
                className="s8-field min-h-24"
                value={form.professional_notes ?? ""}
                onChange={(e) => setForm({ ...form, professional_notes: e.target.value })}
              />
            </Field>
            <Field label="Tarefa para a próxima sessão">
              <textarea
                className="s8-field min-h-20"
                value={form.task ?? ""}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data da sessão">
                <input
                  type="date"
                  className="s8-field"
                  value={form.session_date ?? ""}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                />
              </Field>
              <label className="mt-8 flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.completed}
                  onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                />
                Sessão concluída
              </label>
            </div>
            <button
              type="button"
              onClick={() => save.mutate(undefined)}
              disabled={save.isPending}
              className="no-print mt-4 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
            >
              {save.isPending ? "Salvando…" : "Salvar sessão"}
            </button>
          </div>

          <SessionTimer
            elapsed={form.duration_seconds}
            onElapsedChange={(seconds) => {
              setForm((prev) => ({ ...prev, duration_seconds: seconds }));
              save.mutate({ duration_seconds: seconds });
            }}
          />
        </div>
      )}
    </section>
  );
}

function FieldsCard({
  title,
  table,
  participantId,
  fields,
  values,
  queryKey,
}: {
  title: string;
  table: "business_projects" | "pde_records";
  participantId: string;
  fields: { key: string; label: string; long?: boolean }[];
  values: RecordMap;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RecordMap>(values);

  useEffect(() => setForm(values), [values]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = pick(form, fields.map((f) => f.key));
      const { error } = await supabase
        .from(table)
        .upsert({ participant_id: participantId, ...payload }, { onConflict: "participant_id" });
      if (error) throw new Error("Não foi possível salvar as informações.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Informações salvas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="s8-card">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={field.long ? "sm:col-span-2" : undefined}>
            <Field label={field.label}>
              {field.long ? (
                <textarea
                  className="s8-field min-h-24"
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              ) : (
                <input
                  className="s8-field"
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              )}
            </Field>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="no-print mt-4 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
      >
        {save.isPending ? "Salvando…" : "Salvar"}
      </button>
    </section>
  );
}

function ReportCard({
  participant,
  sessions,
  project,
  pde,
}: {
  participant: Participant;
  sessions: SessionRow[];
  project: RecordMap;
  pde: RecordMap;
}) {
  const [report, setReport] = useState("");

  function build() {
    const lines: string[] = [];
    lines.push("RELATÓRIO FINAL — SISTEMA S8");
    lines.push("Grupo LDR Essence");
    lines.push(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
    lines.push("");
    lines.push(`Participante: ${participant.full_name}`);
    if (participant.business_area) lines.push(`Área: ${participant.business_area}`);
    if (participant.business_stage) lines.push(`Momento: ${participant.business_stage}`);
    if (participant.goal) lines.push(`Objetivo: ${participant.goal}`);
    lines.push("");
    lines.push("— SESSÕES —");
    S8_SESSIONS.forEach((def) => {
      const row = sessions.find((s) => s.session_number === def.number);
      lines.push("");
      lines.push(`Sessão ${def.number}: ${def.title}`);
      lines.push(`Situação: ${row?.completed ? "concluída" : "pendente"}`);
      lines.push(`Escala: ${row?.scale ?? "—"} / 10`);
      if (row?.main_answers) lines.push(`Respostas: ${row.main_answers}`);
      if (row?.professional_notes) lines.push(`Observações: ${row.professional_notes}`);
      if (row?.task) lines.push(`Tarefa: ${row.task}`);
    });
    lines.push("");
    lines.push("— PROJETO DE NEGÓCIO —");
    PROJECT_FIELDS.forEach((f) => {
      if (project[f.key]) lines.push(`${f.label}: ${project[f.key]}`);
    });
    lines.push("");
    lines.push("— PDE —");
    PDE_FIELDS.forEach((f) => {
      if (pde[f.key]) lines.push(`${f.label}: ${pde[f.key]}`);
    });
    setReport(lines.join("\n"));
  }

  return (
    <section className="s8-card">
      <h2 className="font-serif text-2xl">Relatório final</h2>
      <div className="no-print mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={build}
          className="rounded-lg bg-secondary px-4 py-2 font-bold text-secondary-foreground"
        >
          Gerar relatório
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground"
        >
          Imprimir / PDF
        </button>
      </div>
      {report && (
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm">
          {report}
        </pre>
      )}
    </section>
  );
}
