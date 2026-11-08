import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from './client';

/** Retries once on network or 5xx errors. Never retries 4xx (retrying won't fix them). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiRequestError && error.status !== undefined && error.status < 500) {
    return false;
  }
  return failureCount < 1;
}

/** `retryDelay` is overridable so tests can run the real retry policy without waiting. */
export function createQueryClient({ retryDelay }: { retryDelay?: number } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        ...(retryDelay !== undefined ? { retryDelay } : {}),
      },
      mutations: { retry: false },
    },
  });
}
