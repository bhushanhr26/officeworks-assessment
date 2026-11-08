import type { ErrorCode } from '@catalogue/contracts';

/** Base for errors that map to a known API error code. */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

/** The product source (or another dependency) failed. The message is for logs, not clients. */
export class UpstreamError extends DomainError {
  readonly code = 'UPSTREAM_ERROR';
}
