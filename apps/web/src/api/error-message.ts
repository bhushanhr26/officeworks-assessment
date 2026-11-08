import { ApiRequestError } from './client';

/** User-facing text for a failed request. Server messages are shown only for 4xx validation. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Something went wrong. Please try again.';
  }
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'We couldn’t reach the server. Check your connection and try again.';
    case 'UPSTREAM_ERROR':
      return 'Our catalogue is temporarily unavailable. Please try again shortly.';
    case 'RATE_LIMITED':
      return 'You’ve sent several enquiries recently. Please wait a few minutes and try again.';
    case 'VALIDATION_ERROR':
      return `Please check your details: ${error.message}`;
    case 'NOT_FOUND':
      return 'We couldn’t find what you were looking for.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiRequestError && error.code === 'NOT_FOUND';
}
