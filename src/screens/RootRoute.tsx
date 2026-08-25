import { Navigate } from 'react-router-dom';
import { LandingPage } from './marketing/LandingPage';
import { usePersona } from '../dev/PersonaContext';

/**
 * What `/` serves.
 *
 * Logged out — including after any user, owner or admin signs out — `/` is
 * the marketing landing page (S1). Signed in, `/` sends you into the app home
 * (S7, the two doors) at its own path.
 *
 * The signal is `hasSession`: a real `supabase.auth` session, never the
 * dev-harness persona, which can claim to be an admin without anyone having
 * logged in.
 *
 * S7 keeps a route of its own (`/app`) rather than being rendered inline here
 * because guests still browse the app without an account — the whole
 * guest-with-a-search-cap flow depends on it, and "Look around as a guest"
 * has to lead somewhere that isn't this gate. So `/app` is open to everyone;
 * `/` only decides where an arriving visitor is *sent*.
 */
export function RootRoute() {
  const { hasSession, sessionLoading } = usePersona();

  // Render nothing rather than guessing: picking a branch before the session
  // resolves would flash the marketing page at someone who is signed in, and
  // `replace` on the redirect would then leave that flash in their history.
  if (sessionLoading) return null;

  return hasSession ? <Navigate to="/app" replace /> : <LandingPage />;
}
