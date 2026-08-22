import { z } from "zod";

export const catalogToggleSchema = z
  .object({
    catalogKey: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_]+$/),
    active: z.boolean(),
  })
  .strict();

export type CatalogToggleInput = z.infer<typeof catalogToggleSchema>;

export function parseCatalogToggle(data: unknown): CatalogToggleInput {
  const parsed = catalogToggleSchema.safeParse(data);
  if (!parsed.success) throw new Error("Dados inválidos.");
  return parsed.data;
}
