import { Navigate } from 'react-router-dom';
import { LandingPage } from './marketing/LandingPage';
import { usePersona } from '../dev/PersonaContext';
import { hasSearchOrigin, useSearch } from '../lib/searchState';

/**
 * What `/` serves.
 *
 * Logged out — including after any user, owner or admin signs out — `/` is
 * the marketing landing page (S1). Signed in, `/` sends you into the app,
 * but not straight to Home: S8 (`/area`) is now a required stop between auth
 * and Home, and sessionStorage is per-tab, so a signed-in person opening a
 * new tab has to be routed through it exactly like anyone arriving from
 * Splash. `hasSearchOrigin` is the same check that already decides whether a
 * search has a real centre — reused here rather than inventing a second
 * "have we asked" flag.
 *
 * The signal for logged-in-or-not is `hasSession`: a real `supabase.auth`
 * session, never the dev-harness persona, which can claim to be an admin
 * without anyone having logged in.
 *
 * S7 keeps a route of its own (`/app`) rather than being rendered inline here
 * because guests still browse the app without an account — the whole
 * guest-with-a-search-cap flow depends on it, and "Look around as a guest"
 * has to lead somewhere that isn't this gate. So `/app` is open to everyone;
 * `/` only decides where an arriving visitor is *sent*.
 */
export function RootRoute() {
  const { hasSession, sessionLoading } = usePersona();
  const { search } = useSearch();

  // Render nothing rather than guessing: picking a branch before the session
  // resolves would flash the marketing page at someone who is signed in, and
  // `replace` on the redirect would then leave that flash in their history.
  if (sessionLoading) return null;

  if (!hasSession) return <LandingPage />;
  return <Navigate to={hasSearchOrigin(search) ? '/app' : '/area'} replace />;
}
