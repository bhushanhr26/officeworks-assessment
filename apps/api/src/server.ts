import type { Server } from 'node:http';
import type { Express } from 'express';
import { FakeStoreProductRepository } from './adapters/fakestore/fakestore-product-repository';
import { SmtpMailer } from './adapters/smtp/smtp-mailer';
import { createApp } from './app';
import type { Config } from './config';
import type { Logger } from './domain/logger';

/** Production wiring: chooses the real adapters from config. */
export function buildApp(config: Config, featuredProductIds: string[], logger: Logger): Express {
  const productRepository = new FakeStoreProductRepository({
    baseUrl: config.FAKESTORE_BASE_URL,
    timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    cacheTtlMs: config.PRODUCT_CACHE_TTL_MS,
    logger,
  });
  const mailer = SmtpMailer.fromOptions({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    requireTLS: config.SMTP_REQUIRE_TLS,
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
    from: config.MAIL_FROM,
  });

  return createApp({
    productRepository,
    featuredProductIds,
    mailer,
    salesInbox: config.SALES_INBOX,
    enquiryRateLimit: {
      max: config.ENQUIRY_RATE_LIMIT_MAX,
      windowMs: config.ENQUIRY_RATE_LIMIT_WINDOW_MS,
    },
    corsOrigins: config.CORS_ORIGINS,
    trustProxyHops: config.TRUST_PROXY_HOPS,
    logger,
  });
}

interface ShutdownOptions {
  logger: Logger;
  signals?: Pick<NodeJS.EventEmitter, 'once'>;
  exit?: (code: number) => void;
  timeoutMs?: number;
}

/**
 * Stops accepting connections on SIGTERM/SIGINT and lets in-flight requests finish.
 * Without this, Node as PID 1 in a container ignores SIGTERM and gets SIGKILLed after 10s.
 */
export function registerGracefulShutdown(
  server: Pick<Server, 'close'>,
  {
    logger,
    signals = process,
    exit = (code) => process.exit(code),
    timeoutMs = 8_000,
  }: ShutdownOptions,
): void {
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    const force = setTimeout(() => {
      logger.error('Shutdown timed out; forcing exit');
      exit(1);
    }, timeoutMs);
    force.unref();
    server.close((err) => {
      clearTimeout(force);
      if (err) logger.error('Error while closing server', err);
      exit(err ? 1 : 0);
    });
  };
  signals.once('SIGTERM', () => shutdown('SIGTERM'));
  signals.once('SIGINT', () => shutdown('SIGINT'));
}
