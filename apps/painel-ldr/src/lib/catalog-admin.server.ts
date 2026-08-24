// Server-only: administração do catálogo de serviços.
// A tabela não aceita escrita pelo navegador (sem GRANT/policy de UPDATE);
// toda alteração passa por aqui, com verificação de superadmin.
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { resolveAccess, writeAudit } from "@/lib/access.server";

type Client = SupabaseClient<Database>;

export async function setCatalogItemActive(
  supabase: Client,
  userId: string,
  input: { catalogKey: string; active: boolean },
) {
  const access = await resolveAccess(supabase, userId);
  if (!access.authorized || access.role !== "superadmin") throw new Error("Acesso negado.");

  const { data, error } = await supabaseAdmin
    .from("service_catalog")
    .update({ active: input.active })
    .eq("catalog_key", input.catalogKey)
    .select("catalog_key, active")
    .maybeSingle();

  if (error || !data) throw new Error("Não foi possível atualizar o serviço.");

  await writeAudit({
    actorId: userId,
    actorEmail: access.email,
    action: input.active ? "catalog.item_activated" : "catalog.item_deactivated",
    target: input.catalogKey,
  });

  return { ok: true as const, active: data.active };
}
