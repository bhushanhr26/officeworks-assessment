import { randomUUID } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import type { Logger } from '../domain/logger';

const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;

/** Full path without the query string. req.path is router-relative inside mounted routers. */
export function pathOf(req: Request): string {
  return req.originalUrl.split('?')[0] ?? req.originalUrl;
}

export function requestIdOf(res: Response): string | undefined {
  const id: unknown = res.locals.requestId;
  return typeof id === 'string' ? id : undefined;
}

/**
 * Tags each request with an id (reusing a well-formed incoming X-Request-Id, e.g. from a load
 * balancer) and logs one line when it finishes. Logs the path without the query string, so
 * search terms are not logged.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    const requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const path = pathOf(req);
    const startedAt = performance.now();
    res.on('finish', () => {
      const ms = (performance.now() - startedAt).toFixed(1);
      logger.info(`${req.method} ${path} ${res.statusCode} ${ms}ms id=${requestId}`);
    });
    next();
  };
}
