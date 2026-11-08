import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ApiClient } from './client';

const ApiClientContext = createContext<ApiClient | null>(null);

/** Injects the API client so tests can swap in a stub. */
export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used inside <ApiClientProvider>');
  }
  return client;
}
