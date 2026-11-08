import { ProductSchema } from '@catalogue/contracts';
import type { Category, Product } from '@catalogue/contracts';
import { slugify } from '../../lib/slugify';
import type { FakeStoreProduct } from './fakestore-schemas';

/** "men's clothing" -> "Men's Clothing" */
function toDisplayName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function toCategory(raw: string): Category {
  return { slug: slugify(raw), name: toDisplayName(raw) };
}

/**
 * Maps a Fake Store product into OUR model. The output is validated against the contract,
 * so a bad upstream record fails here, not in the UI. Throws ZodError on invalid data.
 */
export function toProduct(source: FakeStoreProduct): Product {
  return ProductSchema.parse({
    id: String(source.id),
    title: source.title.trim(),
    description: source.description.trim(),
    price: source.price,
    // Fake Store has no currency. We assume AUD (SPEC §12).
    currency: 'AUD',
    category: toCategory(source.category),
    imageUrl: source.image,
    rating: { average: source.rating.rate, count: source.rating.count },
  });
}
