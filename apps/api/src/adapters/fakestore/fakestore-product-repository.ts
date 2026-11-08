import type { Category, Product } from '@catalogue/contracts';
import { z } from 'zod';
import { uniqueCategories } from '../../domain/categories';
import { UpstreamError } from '../../domain/errors';
import type { Logger } from '../../domain/logger';
import type { ProductRepository } from '../../domain/product-repository';
import { TtlCache } from '../../lib/ttl-cache';
import { toProduct } from './fakestore-mapper';
import { FakeStoreProductSchema } from './fakestore-schemas';

const DEFAULT_BASE_URL = 'https://fakestoreapi.com';

export interface FakeStoreOptions {
  baseUrl?: string;
  timeoutMs: number;
  cacheTtlMs: number;
  logger: Logger;
  fetchFn?: typeof fetch;
  now?: () => number;
}

/**
 * Fake Store has about 20 products and no search, so we fetch the whole list once, cache it,
 * and serve getById and getCategories from the cached list. A larger source would get
 * per-id and per-query calls behind this same interface.
 */
export class FakeStoreProductRepository implements ProductRepository {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly cache: TtlCache<Product[]>;

  constructor(private readonly options: FakeStoreOptions) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
    this.cache = new TtlCache(options.cacheTtlMs, options.now);
  }

  getAll(): Promise<Product[]> {
    return this.cache.get(() => this.fetchAll());
  }

  async getById(id: string): Promise<Product | null> {
    const products = await this.getAll();
    return products.find((p) => p.id === id) ?? null;
  }

  async getCategories(): Promise<Category[]> {
    return uniqueCategories(await this.getAll());
  }

  private async fetchAll(): Promise<Product[]> {
    const url = `${this.baseUrl}/products`;
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (cause) {
      throw new UpstreamError(`Fake Store request failed: ${url}`, { cause });
    }

    if (!response.ok) {
      throw new UpstreamError(`Fake Store responded ${response.status}: ${url}`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw new UpstreamError('Fake Store returned invalid JSON', { cause });
    }

    return this.mapRecords(body);
  }

  /**
   * One bad record should not take the whole catalogue down: invalid records are skipped and
   * logged. A non-array body, or a list where nothing is valid, is still an upstream failure.
   */
  private mapRecords(body: unknown): Product[] {
    const list = z.array(z.unknown()).safeParse(body);
    if (!list.success) {
      throw new UpstreamError('Fake Store returned unexpected data (not a list)');
    }

    const products: Product[] = [];
    list.data.forEach((record, index) => {
      try {
        products.push(toProduct(FakeStoreProductSchema.parse(record)));
      } catch {
        this.options.logger.warn(`Skipped invalid Fake Store product at index ${index}`);
      }
    });

    if (list.data.length > 0 && products.length === 0) {
      throw new UpstreamError('Fake Store returned no valid products');
    }
    return products;
  }
}
