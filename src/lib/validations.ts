import { z } from "zod";

// --- Sheme ---

export const searchParamsSchema = z.object({
  q: z.string().max(200).optional(),
  brend: z.string().max(100).optional(),
  izvor: z.string().max(50).optional(),
  kategorija: z.string().max(100).optional(),
  dostupnost: z.string().max(20).optional(),
  cena_min: z.coerce.number().int().min(0).max(10_000_000).optional(),
  cena_max: z.coerce.number().int().min(0).max(10_000_000).optional(),
  sort: z
    .enum([
      "cena_asc",
      "cena_desc",
      "popust_desc",
      "naziv_asc",
      "newest",
      "usteda_desc",
    ])
    .optional()
    .default("cena_asc"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

export const productIdSchema = z.coerce.number().int().positive();

export const matchKeySchema = z.string().min(1).max(500);

// --- Helper ---

export function validateParams<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: Response } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: Response.json(
        { error: "Nevažeći parametri", details: result.error.flatten() },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
