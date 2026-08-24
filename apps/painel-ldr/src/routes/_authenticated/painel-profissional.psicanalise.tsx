import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { formatDate, formatDateTime } from "@/lib/central";
import { useAccess, useCustomers } from "@/lib/central-data";
import {
  archiveClinical,
  archiveClinicalAttachmentFn,
  clinicalTrail,
  listClinical,
  listClinicalAttachmentsFn,
  readClinical,
  readClinicalAttachmentFn,
  saveClinical,
  uploadClinicalAttachmentFn,
} from "@/lib/clinical.functions";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
} from "@/lib/clinical.schemas";

export const Route = createFileRoute("/_authenticated/painel-profissional/psicanalise")({
  component: ClinicalPage,
});

function ClinicalPage() {
  const access = useAccess();
  const isOwner = access.data?.role === "superadmin";

  if (access.isLoading) {
    return <p className="s8-card">Verificando permissões…</p>;
  }

  if (!isOwner) {
    return (
      <div className="s8-card">
        <h2 className="font-serif text-xl">Acesso restrito</h2>
        <p className="mt-2 text-sm">
          O prontuário de Psicanálise é sigiloso e disponível apenas para a profissional
          responsável.
        </p>
      </div>
    );
  }

  return <ClinicalWorkspace />;
}

function ClinicalWorkspace() {
  const queryClient = useQueryClient();
  const customers = useCustomers();

  const listFn = useServerFn(listClinical);
  const readFn = useServerFn(readClinical);
  const saveFn = useServerFn(saveClinical);
  const archiveFn = useServerFn(archiveClinical);
  const trailFn = useServerFn(clinicalTrail);

  const records = useQuery({ queryKey: ["clinical-records"], queryFn: () => listFn({}) });
  const trail = useQuery({ queryKey: ["clinical-trail"], queryFn: () => trailFn({}) });

  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const detail = useQuery({
    queryKey: ["clinical-record", openId],
    queryFn: () => readFn({ data: { recordId: openId! } }),
    enabled: Boolean(openId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["clinical-records"] });
    queryClient.invalidateQueries({ queryKey: ["clinical-record"] });
    queryClient.invalidateQueries({ queryKey: ["clinical-trail"] });
  };

  const save = useMutation({
    mutationFn: (input: {
      recordId?: string | null;
      customerId: string | null;
      sessionNumber: number | null;
      sessionDate: string | null;
      content: string;
    }) => saveFn({ data: input }),
    onSuccess: (res) => {
      setCreating(false);
      setOpenId(res.recordId);
      invalidate();
      toast.success("Registro salvo com segurança.");
    },
    onError: () => toast.error("Não foi possível salvar o registro."),
  });

  const archive = useMutation({
    mutationFn: (input: { recordId: string; archived: boolean }) => archiveFn({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Registro atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o registro."),
  });

  const list = records.data?.records ?? [];
  const unavailable = records.data && records.data.available === false;

  function submit(form: FormData, recordId: string | null) {
    const value = (k: string) => String(form.get(k) ?? "").trim();
    save.mutate({
      recordId,
      customerId: value("customerId") || null,
      sessionNumber: value("sessionNumber") ? Number(value("sessionNumber")) : null,
      sessionDate: value("sessionDate") || null,
      content: String(form.get("content") ?? ""),
    });
  }

  return (
    <div>
      <PageHeader
        title="Psicanálise — prontuário sigiloso"
        subtitle="Registros cifrados no servidor com AES-256-GCM e acesso restrito, com trilha de auditoria."
        actions={
          <PrimaryButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Fechar" : "Novo registro"}
          </PrimaryButton>
        }
      />

      {unavailable && (
        <div className="s8-card mb-4">
          <p className="text-sm">
            O módulo clínico está indisponível porque a chave de criptografia não está configurada.
          </p>
        </div>
      )}

      {creating && (
        <form
          className="s8-card mb-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget), null);
          }}
        >
          <Field label="Pessoa atendida" htmlFor="customerId">
            <select id="customerId" name="customerId" className="s8-field">
              <option value="">— não vinculado —</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Número da sessão" htmlFor="sessionNumber">
            <input id="sessionNumber" name="sessionNumber" type="number" min={1} className="s8-field" />
          </Field>
          <Field label="Data da sessão" htmlFor="sessionDate">
            <input id="sessionDate" name="sessionDate" type="date" className="s8-field" />
          </Field>
          <div className="sm:col-span-3">
            <Field label="Anotações clínicas (cifradas)" htmlFor="content">
              <textarea id="content" name="content" rows={8} className="s8-field" required />
            </Field>
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <PrimaryButton type="submit" disabled={save.isPending}>
              Salvar registro
            </PrimaryButton>
            <GhostButton onClick={() => setCreating(false)}>Cancelar</GhostButton>
          </div>
        </form>
      )}

      {list.length === 0 ? (
        <EmptyState
          title="Nenhum registro"
          description="Os prontuários criados aqui ficam cifrados no banco e nunca aparecem para clientes ou colaboradores."
        />
      ) : (
        <ul className="grid gap-3">
          {list.map((r) => (
            <li key={r.id} className="s8-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-serif text-lg">
                    {r.customerName ?? "Sem vínculo"}
                    {r.sessionNumber ? ` — sessão ${r.sessionNumber}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.sessionDate)} • {r.versions} versão(ões) • atualizado em{" "}
                    {formatDateTime(r.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.archived && <StatusBadge tone="neutral">Arquivado</StatusBadge>}
                  <GhostButton
                    className="!px-3 !py-1.5"
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  >
                    {openId === r.id ? "Fechar" : "Abrir"}
                  </GhostButton>
                  <GhostButton
                    className="!px-3 !py-1.5"
                    onClick={() => archive.mutate({ recordId: r.id, archived: !r.archived })}
                  >
                    {r.archived ? "Restaurar" : "Arquivar"}
                  </GhostButton>
                </div>
              </div>

              {openId === r.id && (
                <div className="mt-3 border-t border-border/60 pt-3">
                  {detail.isLoading || !detail.data ? (
                    <p className="text-sm text-muted-foreground">Descriptografando…</p>
                  ) : (
                    <form
                      className="grid gap-3 sm:grid-cols-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submit(new FormData(e.currentTarget), r.id);
                      }}
                    >
                      <Field label="Pessoa atendida">
                        <select
                          name="customerId"
                          className="s8-field"
                          defaultValue={detail.data.record.customerId ?? ""}
                        >
                          <option value="">— não vinculado —</option>
                          {(customers.data ?? []).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Número da sessão">
                        <input
                          name="sessionNumber"
                          type="number"
                          min={1}
                          className="s8-field"
                          defaultValue={detail.data.record.sessionNumber ?? ""}
                        />
                      </Field>
                      <Field label="Data da sessão">
                        <input
                          name="sessionDate"
                          type="date"
                          className="s8-field"
                          defaultValue={detail.data.record.sessionDate ?? ""}
                        />
                      </Field>
                      <div className="sm:col-span-3">
                        <Field label="Anotações clínicas">
                          <textarea
                            name="content"
                            rows={10}
                            className="s8-field"
                            defaultValue={detail.data.versions[0]?.content ?? ""}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-3">
                        <PrimaryButton type="submit" disabled={save.isPending}>
                          Salvar nova versão
                        </PrimaryButton>
                      </div>
                      {detail.data.versions.length > 1 && (
                        <div className="sm:col-span-3">
                          <h3 className="font-serif text-base">Versões anteriores</h3>
                          <ul className="mt-2 space-y-2 text-sm">
                            {detail.data.versions.slice(1).map((v) => (
                              <li key={v.id} className="border-b border-border/60 pb-2 last:border-0">
                                <span className="text-xs text-muted-foreground">
                                  v{v.version} • {formatDateTime(v.createdAt)}
                                </span>
                                <p className="whitespace-pre-wrap">{v.content}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </form>
                  )}
                  {openId === r.id && <ClinicalAttachments recordId={r.id} />}
                  {false && (
                    <span />

                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="s8-card mt-4">
        <h2 className="font-serif text-lg">Trilha de acesso</h2>
        {(trail.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem acessos registrados.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {(trail.data ?? []).map((t) => (
              <li key={t.id} className="text-muted-foreground">
                <span className="font-bold text-foreground">{t.action}</span> •{" "}
                {t.actor_email ?? "—"} • {formatDateTime(t.created_at)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Anexos cifrados do prontuário: upload, download temporário e arquivamento. */
function ClinicalAttachments({ recordId }: { recordId: string }) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listClinicalAttachmentsFn);
  const uploadFn = useServerFn(uploadClinicalAttachmentFn);
  const readFn = useServerFn(readClinicalAttachmentFn);
  const archiveFn = useServerFn(archiveClinicalAttachmentFn);

  const attachments = useQuery({
    queryKey: ["clinical-attachments", recordId],
    queryFn: () => listFn({ data: { recordId } }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["clinical-attachments", recordId] });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw new Error("Tipo de arquivo não permitido.");
      }
      if (file.size > ATTACHMENT_MAX_BYTES) throw new Error("Arquivo acima de 10 MB.");
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
      return uploadFn({
        data: {
          recordId,
          fileName: file.name,
          mimeType: file.type as (typeof ATTACHMENT_MIME_TYPES)[number],
          contentBase64: btoa(binary),
        },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Anexo cifrado e guardado.");
    },
    onError: () => toast.error("Não foi possível enviar o anexo (máx. 10 MB; PDF, imagem, DOC/DOCX ou texto)."),
  });

  const open = useMutation({
    mutationFn: (attachmentId: string) => readFn({ data: { attachmentId } }),
    onSuccess: (res) => {
      const bin = atob(res.contentBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: res.mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = res.fileName;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error("Anexo indisponível."),
  });

  const archive = useMutation({
    mutationFn: (input: { attachmentId: string; archived: boolean }) => archiveFn({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Anexo atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o anexo."),
  });

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <h3 className="font-serif text-base">Anexos cifrados</h3>
      <p className="text-xs text-muted-foreground">
        Arquivos são cifrados no servidor (AES-256-GCM) e ficam num armazenamento
        privado sem acesso público. Nunca são excluídos, apenas arquivados.
      </p>
      <input
        type="file"
        className="s8-field mt-2"
        accept={ATTACHMENT_ACCEPT}
        disabled={upload.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />
      <ul className="mt-3 space-y-2 text-sm">
        {(attachments.data ?? []).length === 0 && (
          <li className="text-muted-foreground">Nenhum anexo.</li>
        )}
        {(attachments.data ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {a.fileName}
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDateTime(a.createdAt)}
                {a.archived ? " • arquivado" : ""}
              </span>
            </span>
            <span className="flex gap-2">
              {!a.archived && (
                <GhostButton className="!px-3 !py-1.5" onClick={() => open.mutate(a.id)}>
                  Baixar
                </GhostButton>
              )}
              <GhostButton
                className="!px-3 !py-1.5"
                onClick={() => archive.mutate({ attachmentId: a.id, archived: !a.archived })}
              >
                {a.archived ? "Restaurar" : "Arquivar"}
              </GhostButton>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
