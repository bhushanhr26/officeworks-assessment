import type { Category, Product } from '@catalogue/contracts';

/** Distinct categories across products, sorted by display name. Shared by repository adapters. */
export function uniqueCategories(products: readonly Product[]): Category[] {
  const bySlug = new Map(products.map((p) => [p.category.slug, p.category]));
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}
