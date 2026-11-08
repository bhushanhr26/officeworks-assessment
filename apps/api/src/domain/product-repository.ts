import type { Category, Product } from '@catalogue/contracts';

/**
 * Port for the product data source. Services depend on this, never on an adapter.
 * Adapters throw UpstreamError when the source is unavailable or returns bad data.
 */
export interface ProductRepository {
  getAll(): Promise<Product[]>;
  /** Resolves to null when the id does not exist. */
  getById(id: string): Promise<Product | null>;
  getCategories(): Promise<Category[]>;
}
