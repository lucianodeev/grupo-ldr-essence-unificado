import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { addUser, auditLogs, listUsers, removeUser, toggleUserActive } from "@/lib/access.functions";
import type { AppRole } from "@/lib/access.server";

export function AccessManagement() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const fetchLogs = useServerFn(auditLogs);
  const create = useServerFn(addUser);
  const toggle = useServerFn(toggleUserActive);
  const remove = useServerFn(removeUser);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("colaborador");

  const users = useQuery({ queryKey: ["access-users"], queryFn: () => fetchUsers({}) });
  const logs = useQuery({ queryKey: ["audit-logs"], queryFn: () => fetchLogs({}) });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["access-users"] });
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  }

  const createMutation = useMutation({
    mutationFn: () => create({ data: { email, fullName, password, role } }),
    onSuccess: () => {
      toast.success("Acesso criado.");
      setEmail("");
      setFullName("");
      setPassword("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível criar o acesso."),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { targetId: string; isActive: boolean }) => toggle({ data: vars }),
    onSuccess: () => {
      toast.success("Acesso atualizado.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Ação não permitida."),
  });

  const removeMutation = useMutation({
    mutationFn: (vars: { targetId: string }) => remove({ data: vars }),
    onSuccess: () => {
      toast.success("Acesso removido.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Ação não permitida."),
  });

  return (
    <div className="space-y-4">
      <section className="s8-card">
        <h2 className="font-serif text-2xl">Gestão de acessos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada pessoa deve usar a própria conta. Defina uma senha inicial forte e peça a troca no
          primeiro acesso, pela opção “Esqueci minha senha”.
        </p>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div>
            <label className="s8-label" htmlFor="new-email">
              E-mail
            </label>
            <input
              id="new-email"
              type="email"
              required
              className="s8-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="s8-label" htmlFor="new-name">
              Nome completo
            </label>
            <input
              id="new-name"
              required
              className="s8-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="s8-label" htmlFor="new-password">
              Senha inicial (mín. 12 caracteres)
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              className="s8-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="s8-label" htmlFor="new-role">
              Perfil
            </label>
            <select
              id="new-role"
              className="s8-field"
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
            >
              <option value="colaborador">Colaborador</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
            >
              {createMutation.isPending ? "Criando…" : "Cadastrar acesso"}
            </button>
          </div>
        </form>
      </section>

      <section className="s8-card">
        <h3 className="font-serif text-xl">Pessoas com acesso</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Nome</th>
                <th className="py-2">E-mail</th>
                <th className="py-2">Perfil</th>
                <th className="py-2">Situação</th>
                <th className="py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2">{u.fullName ?? "—"}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.role ?? "sem perfil"}</td>
                  <td className="py-2">
                    <span
                      className="rounded-full px-2 py-1 text-xs font-bold"
                      style={{
                        background: u.isActive ? "var(--gold-soft)" : "var(--muted)",
                        color: u.isActive ? "var(--accent-foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      {u.isActive ? "ativo" : "inativo"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-3 py-1 text-xs font-bold text-primary"
                        onClick={() =>
                          toggleMutation.mutate({ targetId: u.id, isActive: !u.isActive })
                        }
                      >
                        {u.isActive ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="rounded-md px-3 py-1 text-xs font-bold text-destructive-foreground"
                        style={{ background: "var(--destructive)" }}
                        onClick={() => {
                          if (window.confirm("Remover definitivamente o acesso desta pessoa?")) {
                            removeMutation.mutate({ targetId: u.id });
                          }
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="s8-card">
        <h3 className="font-serif text-xl">Registros de auditoria</h3>
        <ul className="mt-3 space-y-1 text-sm">
          {(logs.data ?? []).map((log) => (
            <li key={log.id} className="border-b border-border py-1">
              <span className="font-semibold">{log.action}</span>{" "}
              <span className="text-muted-foreground">
                — {log.actor_email ?? "—"} • {new Date(log.created_at).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
          {logs.data?.length === 0 && (
            <li className="text-muted-foreground">Nenhum registro por enquanto.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
