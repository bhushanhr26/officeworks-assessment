import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProductIdSchema } from '@catalogue/contracts';
import { z } from 'zod';

export const FEATURED_COUNT = 5;

const FeaturedConfigSchema = z.object({
  productIds: z
    .array(ProductIdSchema)
    .length(FEATURED_COUNT, `Exactly ${FEATURED_COUNT} featured product ids are required`)
    .refine((ids) => new Set(ids).size === ids.length, 'Featured product ids must be unique'),
});

/** Parses featured config JSON. Throws with a readable message on invalid content. */
export function parseFeaturedConfig(raw: unknown): string[] {
  const result = FeaturedConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid featured config: ${result.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  return result.data.productIds;
}

export function loadFeaturedProductIds(path: string): string[] {
  const fullPath = resolve(path);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (cause) {
    throw new Error(`Could not read featured config at ${fullPath}`, { cause });
  }
  return parseFeaturedConfig(raw);
}
