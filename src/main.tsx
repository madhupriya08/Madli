import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { PersonaProvider } from './dev/PersonaContext';
import { GuestSessionProvider } from './lib/guestSession';
import { ToastProvider } from './components/feedback/ToastProvider';
import { loadLiveConfig } from './lib/liveConfig';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

function renderApp() {
  createRoot(rootEl!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <PersonaProvider>
          <GuestSessionProvider>
            <ToastProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ToastProvider>
          </GuestSessionProvider>
        </PersonaProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

function renderFatalError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  createRoot(rootEl!).render(
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Madli couldn&apos;t load</h1>
      <p>Failed to reach Supabase for reference data (places, categories, areas, config).</p>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{message}</pre>
    </div>,
  );
}

// Reference data (places, categories, areas, app_config) is loaded once here,
// before the app ever renders — see src/lib/liveConfig.ts for why this is a
// startup prefetch rather than a per-screen hook.
loadLiveConfig().then(renderApp).catch(renderFatalError);
