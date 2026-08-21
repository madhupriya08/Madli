import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider } from '../dev/PersonaContext';
import { ToastProvider } from '../components/feedback/ToastProvider';

/**
 * Shared provider stack for screen-level RTL tests: query client + persona +
 * toasts + router. `path` is the route pattern the screen expects to be
 * mounted at (so useParams works); `route` is the entry the router starts on.
 */
export function renderWithProviders(
  ui: ReactElement,
  { path = '/', route = '/' }: { path?: string; route?: string } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={path} element={ui} />
              <Route path="*" element={null} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </PersonaProvider>
    </QueryClientProvider>,
  );
}
