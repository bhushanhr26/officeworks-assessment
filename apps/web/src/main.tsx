import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ApiClientProvider } from './api/api-context';
import { createApiClient } from './api/client';
import { createQueryClient } from './api/query-client';
import { App } from './App';
import { resolveApiBaseUrl } from './config';
import './styles/tokens.css';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const apiClient = createApiClient(resolveApiBaseUrl(import.meta.env.VITE_API_URL));
const queryClient = createQueryClient();

createRoot(rootElement).render(
  <StrictMode>
    <ApiClientProvider client={apiClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ApiClientProvider>
  </StrictMode>,
);
