import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseCatalogToggle } from "@/lib/catalog-admin.schemas";

export const setCatalogActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseCatalogToggle)
  .handler(async ({ context, data }) => {
    const { setCatalogItemActive } = await import("@/lib/catalog-admin.server");
    return setCatalogItemActive(context.supabase, context.userId, data);
  });
