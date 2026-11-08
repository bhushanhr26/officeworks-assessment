import type { ApiError, ErrorCode } from '@catalogue/contracts';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../domain/errors';
import type { Logger } from '../domain/logger';
import { pathOf, requestIdOf } from './request-logger';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

// Never echo internal or upstream details to clients.
const PUBLIC_MESSAGE: Partial<Record<ErrorCode, string>> = {
  UPSTREAM_ERROR: 'A service we depend on is temporarily unavailable. Please try again shortly.',
  INTERNAL: 'Something went wrong.',
};

/** express.json() errors: malformed JSON or a body over the size limit. */
function isBodyParserError(err: unknown): err is { type: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')
  );
}

function toApiError(err: unknown): ApiError {
  if (isBodyParserError(err)) {
    const message =
      err.type === 'entity.too.large' ? 'Request body too large' : 'Malformed JSON body';
    return { error: { code: 'VALIDATION_ERROR', message } };
  }
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    return { error: { code: 'VALIDATION_ERROR', message } };
  }
  if (err instanceof DomainError) {
    return { error: { code: err.code, message: PUBLIC_MESSAGE[err.code] ?? err.message } };
  }
  return { error: { code: 'INTERNAL', message: PUBLIC_MESSAGE.INTERNAL ?? '' } };
}

export function notFoundHandler(): RequestHandler {
  return (_req, res) => {
    const body: ApiError = { error: { code: 'NOT_FOUND', message: 'Route not found' } };
    res.status(404).json(body);
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  // Express identifies error middleware by its 4-argument signature.
  return (err: unknown, req, res, _next) => {
    const body = toApiError(err);
    const status = STATUS_BY_CODE[body.error.code];
    if (status >= 500) {
      logger.error(`${req.method} ${pathOf(req)} -> ${status} id=${requestIdOf(res) ?? '-'}`, err);
    }
    res.status(status).json(body);
  };
}
