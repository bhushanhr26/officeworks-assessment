import type { Product } from '@catalogue/contracts';
import { vi } from 'vitest';
import { InMemoryProductRepository } from '../adapters/in-memory/in-memory-product-repository';
import { createApp } from '../app';
import { FakeMailer } from './fake-mailer';

export const TEST_SALES_INBOX = 'sales@shop.test';
export const TEST_WEB_ORIGIN = 'http://web.test';

interface TestAppOptions {
  featuredProductIds?: string[];
  rateLimitMax?: number;
}

/** App wired with in-memory fakes and a silent, inspectable logger. */
export function makeTestApp(products: Product[] = [], options: TestAppOptions = {}) {
  const repository = new InMemoryProductRepository(products);
  const mailer = new FakeMailer();
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
  const app = createApp({
    productRepository: repository,
    featuredProductIds: options.featuredProductIds ?? [],
    mailer,
    salesInbox: TEST_SALES_INBOX,
    enquiryRateLimit: { max: options.rateLimitMax ?? 1000, windowMs: 60_000 },
    corsOrigins: [TEST_WEB_ORIGIN],
    logger,
  });
  return { app, repository, mailer, logger };
}
