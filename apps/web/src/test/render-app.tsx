import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { ApiClientProvider } from '../api/api-context';
import type { ApiClient } from '../api/client';
import { createQueryClient } from '../api/query-client';
import { App } from '../App';
import { ELECTRONICS, JEWELERY } from './fixtures';

export type ApiStub = { [K in keyof ApiClient]: Mock<ApiClient[K]> };

function notStubbed(name: string) {
  return () => Promise.reject(new Error(`${name} was not stubbed in this test`));
}

/** Stub API client. Header calls (categories) resolve by default; everything else must be stubbed. */
export function makeApiStub(): ApiStub {
  return {
    getCategories: vi.fn<ApiClient['getCategories']>().mockResolvedValue([ELECTRONICS, JEWELERY]),
    getFeaturedProducts: vi.fn<ApiClient['getFeaturedProducts']>().mockResolvedValue([]),
    getCategoryProducts: vi.fn<ApiClient['getCategoryProducts']>(notStubbed('getCategoryProducts')),
    searchProducts: vi.fn<ApiClient['searchProducts']>(notStubbed('searchProducts')),
    getProduct: vi.fn<ApiClient['getProduct']>(notStubbed('getProduct')),
    submitEnquiry: vi.fn<ApiClient['submitEnquiry']>(notStubbed('submitEnquiry')),
  };
}

/** Renders the real App (router, query client, pages) at `route` against a stub API. */
export function renderApp(route: string, api: ApiStub = makeApiStub()) {
  // The production client (real retry policy), minus the retry delay.
  const queryClient = createQueryClient({ retryDelay: 0 });
  const user = userEvent.setup();
  const utils = render(
    <ApiClientProvider client={api}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </ApiClientProvider>,
  );
  return { ...utils, user, api };
}
