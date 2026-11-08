import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Express } from 'express';
import type { Logger } from './domain/logger';
import type { Mailer } from './domain/mailer';
import type { ProductRepository } from './domain/product-repository';
import { errorHandler, notFoundHandler } from './http/error-handler';
import { enquiryRateLimiter } from './http/rate-limit';
import { requestLogger } from './http/request-logger';
import type { RateLimitOptions } from './http/rate-limit';
import { categoriesRouter } from './routes/categories';
import { enquiriesRouter } from './routes/enquiries';
import { healthRouter } from './routes/health';
import { productsRouter } from './routes/products';
import { CatalogueService } from './services/catalogue-service';
import { EnquiryService } from './services/enquiry-service';

export interface AppDeps {
  productRepository: ProductRepository;
  featuredProductIds: readonly string[];
  mailer: Mailer;
  salesInbox: string;
  enquiryRateLimit: RateLimitOptions;
  /** Exact origins allowed to call the API from a browser (e.g. the web app). */
  corsOrigins: readonly string[];
  trustProxyHops?: number;
  logger?: Logger;
}

// Composition root: adapters are chosen by the caller (index.ts in prod, fakes in tests).
export function createApp(deps: AppDeps): Express {
  const logger = deps.logger ?? console;
  const catalogue = new CatalogueService(deps.productRepository, deps.featuredProductIds, logger);
  const enquiries = new EnquiryService(
    deps.productRepository,
    deps.mailer,
    deps.salesInbox,
    logger,
  );

  const app = express();
  app.disable('x-powered-by');
  // Needed for correct client IPs (rate limiting) behind a load balancer.
  app.set('trust proxy', deps.trustProxyHops ?? 0);
  app.use(requestLogger(logger));
  app.use(helmet());
  // Allowlist only: other origins get no CORS headers, so the browser blocks them.
  app.use(
    cors({
      origin: [...deps.corsOrigins],
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '10kb' }));

  app.use(healthRouter());
  app.use('/api/products', productsRouter(catalogue));
  app.use('/api/categories', categoriesRouter(catalogue));
  app.use('/api/enquiries', enquiriesRouter(enquiries, enquiryRateLimiter(deps.enquiryRateLimit)));

  app.use(notFoundHandler());
  app.use(errorHandler(logger));
  return app;
}
