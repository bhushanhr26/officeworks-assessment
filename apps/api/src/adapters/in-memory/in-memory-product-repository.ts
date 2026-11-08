import type { Category, Product } from '@catalogue/contracts';
import { uniqueCategories } from '../../domain/categories';
import type { ProductRepository } from '../../domain/product-repository';

/**
 * ProductRepository backed by an array. Used as the test double, and usable as an
 * offline data source. `failWith` makes every call reject (e.g. to simulate an outage).
 */
export class InMemoryProductRepository implements ProductRepository {
  failWith: Error | undefined;

  constructor(private readonly products: Product[]) {}

  async getAll(): Promise<Product[]> {
    this.throwIfFailing();
    return [...this.products];
  }

  async getById(id: string): Promise<Product | null> {
    this.throwIfFailing();
    return this.products.find((p) => p.id === id) ?? null;
  }

  async getCategories(): Promise<Category[]> {
    this.throwIfFailing();
    return uniqueCategories(this.products);
  }

  private throwIfFailing(): void {
    if (this.failWith) throw this.failWith;
  }
}
