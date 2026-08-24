// Server-only helpers for authentication, authorization and access management.
// Never imported by client code (filename is blocked from the client bundle).
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;
export type AppRole = "superadmin" | "colaborador";

export type AccessUser = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  role: AppRole | null;
  createdAt: string;
};

/** Generic error, never leaks internal details to the client. */
function fail(message: string): never {
  throw new Error(message);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function writeAudit(input: {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  target?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: input.actorId,
    actor_email: input.actorEmail,
    action: input.action,
    target: input.target ?? null,
    details: (input.details ?? {}) as never,
  });
}

/** Resolves the caller's authorization from their own (RLS-scoped) client. */
export async function resolveAccess(supabase: Client, userId: string) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, is_active").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const role = (roles?.[0]?.role ?? null) as AppRole | null;
  const authorized = Boolean(profile?.is_active && role);

  return {
    authorized,
    role,
    email: profile?.email ?? null,
    fullName: profile?.full_name ?? null,
  };
}

async function requireSuperadmin(supabase: Client, userId: string) {
  const access = await resolveAccess(supabase, userId);
  if (!access.authorized || access.role !== "superadmin") fail("Acesso negado.");
  return access;
}

export async function bootstrapFirstSuperadmin(input: {
  secret: string;
  email: string;
  password: string;
  fullName: string;
}) {
  const expected = process.env["S8_BOOTSTRAP_SECRET"];
  if (!expected) fail("Bootstrap indisponível.");

  const { data: state } = await supabaseAdmin
    .from("app_bootstrap")
    .select("completed")
    .eq("id", true)
    .maybeSingle();

  if (!state || state.completed) fail("Bootstrap indisponível.");
  if (!timingSafeEqual(input.secret, expected)) fail("Bootstrap indisponível.");
  if (input.password.length < 12) fail("A senha deve ter ao menos 12 caracteres.");

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !created.user) fail("Não foi possível concluir o bootstrap.");

  const userId = created.user.id;
  await supabaseAdmin.from("profiles").insert({
    id: userId,
    email: input.email.trim().toLowerCase(),
    full_name: input.fullName,
    is_active: true,
  });
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "superadmin" });

  // Single use: permanently closes the bootstrap flow.
  await supabaseAdmin
    .from("app_bootstrap")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", true);

  await writeAudit({
    actorId: userId,
    actorEmail: input.email,
    action: "bootstrap.superadmin_created",
    target: userId,
  });

  return { ok: true as const };
}

export async function bootstrapIsOpen() {
  const { data } = await supabaseAdmin
    .from("app_bootstrap")
    .select("completed")
    .eq("id", true)
    .maybeSingle();
  return { open: Boolean(data && !data.completed) };
}

export async function listAccessUsers(supabase: Client, userId: string): Promise<AccessUser[]> {
  await requireSuperadmin(supabase, userId);

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, is_active, created_at")
    .order("created_at", { ascending: true });
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

  const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    isActive: p.is_active,
    role: roleByUser.get(p.id) ?? null,
    createdAt: p.created_at,
  }));
}

export async function createCollaborator(
  supabase: Client,
  userId: string,
  input: { email: string; fullName: string; password: string; role: AppRole },
) {
  const actor = await requireSuperadmin(supabase, userId);
  if (input.password.length < 12) fail("A senha inicial deve ter ao menos 12 caracteres.");

  const email = input.email.trim().toLowerCase();
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !created.user) fail("Não foi possível criar este acesso.");

  await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: input.fullName,
    is_active: true,
  });
  await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: input.role });

  await writeAudit({
    actorId: userId,
    actorEmail: actor.email,
    action: "access.user_created",
    target: created.user.id,
    details: { role: input.role },
  });

  return { ok: true as const };
}

export async function setUserActive(
  supabase: Client,
  userId: string,
  input: { targetId: string; isActive: boolean },
) {
  const actor = await requireSuperadmin(supabase, userId);
  if (input.targetId === userId) fail("Você não pode alterar o próprio acesso.");

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: input.isActive })
    .eq("id", input.targetId);
  if (error) fail("Não foi possível atualizar este acesso.");

  await writeAudit({
    actorId: userId,
    actorEmail: actor.email,
    action: input.isActive ? "access.user_activated" : "access.user_deactivated",
    target: input.targetId,
  });

  return { ok: true as const };
}

export async function removeUserAccess(
  supabase: Client,
  userId: string,
  input: { targetId: string },
) {
  const actor = await requireSuperadmin(supabase, userId);
  if (input.targetId === userId) fail("Você não pode remover o próprio acesso.");

  await supabaseAdmin.from("user_roles").delete().eq("user_id", input.targetId);
  await supabaseAdmin.from("profiles").delete().eq("id", input.targetId);
  await supabaseAdmin.auth.admin.deleteUser(input.targetId);

  await writeAudit({
    actorId: userId,
    actorEmail: actor.email,
    action: "access.user_removed",
    target: input.targetId,
  });

  return { ok: true as const };
}

export async function listAuditLogs(supabase: Client, userId: string) {
  await requireSuperadmin(supabase, userId);
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("id, actor_email, action, target, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

/** Lista operacional da equipe: visível para qualquer usuário autorizado (não expõe dados sensíveis). */
export async function listTeamMembers(supabase: Client, userId: string): Promise<AccessUser[]> {
  const access = await resolveAccess(supabase, userId);
  if (!access.authorized) fail("Acesso negado.");

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, is_active, created_at")
    .order("full_name", { ascending: true });
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
  const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    isActive: p.is_active,
    role: roleByUser.get(p.id) ?? null,
    createdAt: p.created_at,
  }));
}
