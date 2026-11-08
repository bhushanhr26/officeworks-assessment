import type { Category, CategoryProducts, Product } from '@catalogue/contracts';
import { NotFoundError, ValidationError } from '../domain/errors';
import type { Logger } from '../domain/logger';
import type { ProductRepository } from '../domain/product-repository';

const TOP_RATED_COUNT = 3;

/** Highest average first, then most ratings, then title for a stable order. */
function byRating(a: Product, b: Product): number {
  return (
    b.rating.average - a.rating.average ||
    b.rating.count - a.rating.count ||
    a.title.localeCompare(b.title)
  );
}

export class CatalogueService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly featuredProductIds: readonly string[],
    private readonly logger: Logger,
  ) {}

  /**
   * Curated products in configured order. Ids missing from the source are skipped (the page
   * still renders), but logged: fewer than 5 featured products is a config problem to fix.
   */
  async getFeatured(): Promise<Product[]> {
    const results = await Promise.all(
      this.featuredProductIds.map(async (id) => ({
        id,
        product: await this.repository.getById(id),
      })),
    );
    const missing = results.filter((r) => r.product === null).map((r) => r.id);
    if (missing.length > 0) {
      this.logger.warn(`Featured product ids not found in source: ${missing.join(', ')}`);
    }
    return results.flatMap((r) => (r.product ? [r.product] : []));
  }

  listCategories(): Promise<Category[]> {
    return this.repository.getCategories();
  }

  async getCategoryProducts(slug: string): Promise<CategoryProducts> {
    const categories = await this.repository.getCategories();
    if (!categories.some((c) => c.slug === slug)) {
      throw new NotFoundError(`Category "${slug}" not found`);
    }
    const sorted = (await this.repository.getAll())
      .filter((p) => p.category.slug === slug)
      .sort(byRating);
    return { topRated: sorted.slice(0, TOP_RATED_COUNT), others: sorted.slice(TOP_RATED_COUNT) };
  }

  /** Case-insensitive substring match on title, description and category name. Source order. */
  async search(term: string): Promise<Product[]> {
    const needle = term.trim().toLowerCase();
    if (!needle) {
      throw new ValidationError('Search term is required');
    }
    const products = await this.repository.getAll();
    return products.filter((p) =>
      [p.title, p.description, p.category.name].some((text) => text.toLowerCase().includes(needle)),
    );
  }

  async getById(id: string): Promise<Product> {
    const product = await this.repository.getById(id);
    if (!product) {
      throw new NotFoundError(`Product "${id}" not found`);
    }
    return product;
  }
}
