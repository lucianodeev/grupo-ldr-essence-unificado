import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/lib/access.server";

export const bootstrapStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { bootstrapIsOpen } = await import("@/lib/access.server");
  return bootstrapIsOpen();
});

export const runBootstrap = createServerFn({ method: "POST" })
  .inputValidator((data: { secret: string; email: string; password: string; fullName: string }) => data)
  .handler(async ({ data }) => {
    const { bootstrapFirstSuperadmin } = await import("@/lib/access.server");
    return bootstrapFirstSuperadmin(data);
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAccess } = await import("@/lib/access.server");
    return resolveAccess(context.supabase, context.userId);
  });

export const logAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { action: string }) => data)
  .handler(async ({ context, data }) => {
    const { resolveAccess, writeAudit } = await import("@/lib/access.server");
    const access = await resolveAccess(context.supabase, context.userId);
    await writeAudit({
      actorId: context.userId,
      actorEmail: access.email,
      action: data.action,
    });
    return { ok: true as const };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAccessUsers } = await import("@/lib/access.server");
    return listAccessUsers(context.supabase, context.userId);
  });

export const addUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { email: string; fullName: string; password: string; role: AppRole }) => data,
  )
  .handler(async ({ context, data }) => {
    const { createCollaborator } = await import("@/lib/access.server");
    return createCollaborator(context.supabase, context.userId, data);
  });

export const toggleUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { targetId: string; isActive: boolean }) => data)
  .handler(async ({ context, data }) => {
    const { setUserActive } = await import("@/lib/access.server");
    return setUserActive(context.supabase, context.userId, data);
  });

export const removeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { targetId: string }) => data)
  .handler(async ({ context, data }) => {
    const { removeUserAccess } = await import("@/lib/access.server");
    return removeUserAccess(context.supabase, context.userId, data);
  });

export const auditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAuditLogs } = await import("@/lib/access.server");
    return listAuditLogs(context.supabase, context.userId);
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listTeamMembers } = await import("@/lib/access.server");
    return listTeamMembers(context.supabase, context.userId);
  });
