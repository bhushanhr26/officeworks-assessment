import { describe, expect, it } from 'vitest';
import { ApiRequestError } from './client';
import { shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it('never retries 4xx', () => {
    expect(shouldRetry(0, new ApiRequestError('NOT_FOUND', 'x', 404))).toBe(false);
  });

  it('retries 5xx and network errors once', () => {
    expect(shouldRetry(0, new ApiRequestError('UPSTREAM_ERROR', 'x', 502))).toBe(true);
    expect(shouldRetry(0, new ApiRequestError('NETWORK_ERROR', 'x'))).toBe(true);
    expect(shouldRetry(1, new ApiRequestError('NETWORK_ERROR', 'x'))).toBe(false);
  });
});
