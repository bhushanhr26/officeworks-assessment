import type { ApiError } from '@catalogue/contracts';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/**
 * Per-IP fixed-window limiter with an in-memory store. That is fine for one instance;
 * multiple instances need a shared store such as Redis or ElastiCache (see SPEC §7).
 */
export function enquiryRateLimiter({ windowMs, max }: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      const body: ApiError = {
        error: { code: 'RATE_LIMITED', message: 'Too many enquiries. Please try again later.' },
      };
      res.status(429).json(body);
    },
  });
}
