import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useIsDesktop } from '../lib/useBreakpoint';
import { identify, resetAnalytics } from '../lib/analytics';

/**
 * Phase 3: this now reflects a real `supabase.auth` session + `profiles`
 * row when one exists (checked once on mount via `getSession()`, kept in
 * sync via `onAuthStateChange`), while keeping the exact same hook shape
 * `usePersona()` always had — no screen needed to change for this swap.
 *
 * The dev-only persona quick-switch (`DevHarness`, stripped from production
 * builds) still works exactly as in Phase 2: clicking Guest/User/Owner/Admin
 * there calls `setPersona()` directly against the fixed
 * MOCK_USER_ID/MOCK_OWNER_ID/MOCK_ADMIN_ID test-account ids, without going
 * through a real login — a deliberate, disclosed dev convenience, not
 * something this phase was asked to remove. A *real* login
 * (LoginScreen/AdminLoginScreen) creates a real session first and then calls
 * `setPersona()`, so both paths converge on the same state shape.
 *
 * "Owner" here is a coarse, dev-harness-only persona value — the real,
 * per-place Owner-mode check screens must use is `useOwnsVerifiedClaim(placeId)`
 * (src/data/hooks.ts), which calls the real `owns_verified_claim()` RPC
 * scoped to the actual signed-in user, not this global persona field. See
 * PHASE_3_COMPLETION_REPORT.md §4 for why: a real user can hold zero, one, or
 * several verified claims, so "Owner" can't be a single global identity.
 */
export type Persona = 'guest' | 'user' | 'owner' | 'admin';
export type AdminTier = 'superadmin' | 'catalogue' | 'moderation';
export type Breakpoint = 'mobile' | 'desktop';

export interface PersonaState {
  persona: Persona;
  /** Mirrors profiles.admin_tier — meaningful only when persona === 'admin'. */
  adminTier: AdminTier;
  /** Mirrors profiles.can_override_ranking — an explicit per-account grant, not implied by tier. */
  canOverrideRanking: boolean;
  /** Mirrors profiles.can_access_location_history — same, explicit grant. */
  canAccessLocationHistory: boolean;
  breakpoint: Breakpoint;
  /** The real signed-in user's id when a session exists; a fixed mock id under a dev-harness override; '' for guest. */
  userId: string;
  /**
   * What to call this person, from profiles.display_name — the name they gave
   * at signup. Null for guests, and for accounts created before signup asked
   * for one. Screens must handle null rather than printing "Welcome back,
   * null" or inventing a placeholder.
   */
  displayName: string | null;
  /**
   * Whether a real `supabase.auth` session exists — the routing source of
   * truth for logged-in vs logged-out.
   *
   * Deliberately NOT derived from `persona`: the dev harness can set persona
   * to User/Owner/Admin without any login at all, and `/` must not hand the
   * app to someone who never authenticated just because a dev tool says so.
   * Also independent of the `profiles` fetch below — a session is a session
   * even if that row read fails, so a network blip degrades a signed-in
   * person's role, never their sign-in.
   */
  hasSession: boolean;
  /** True until the first `getSession()` settles. Routing must wait rather than guess. */
  sessionLoading: boolean;
}

interface PersonaContextValue extends PersonaState {
  setPersona: (p: Persona) => void;
  setAdminTier: (t: AdminTier) => void;
  setCanOverrideRanking: (v: boolean) => void;
  setCanAccessLocationHistory: (v: boolean) => void;
  setBreakpoint: (b: Breakpoint) => void;
  /** Clears the real Supabase session (not just local persona state) and resets to Guest. */
  signOut: () => Promise<void>;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

// Fixed ids matching Phase 1's real dev test accounts (supabase/README.md),
// used only by the dev-harness quick-switch below — a real session's own
// user id is used instead whenever one exists.
export const MOCK_USER_ID = '10000000-0000-0000-0000-000000000002';
export const MOCK_OWNER_ID = '10000000-0000-0000-0000-000000000003';
export const MOCK_ADMIN_ID = '10000000-0000-0000-0000-000000000001';

function userIdForPersona(persona: Persona): string {
  if (persona === 'owner') return MOCK_OWNER_ID;
  if (persona === 'admin') return MOCK_ADMIN_ID;
  if (persona === 'user') return MOCK_USER_ID;
  return '';
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>('guest');
  const [adminTier, setAdminTier] = useState<AdminTier>('superadmin');
  const [canOverrideRanking, setCanOverrideRanking] = useState(true);
  const [canAccessLocationHistory, setCanAccessLocationHistory] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // `breakpoint` follows the real viewport. Until now it was a plain
  // useState('mobile') that only the dev harness could ever change, so a
  // production build was permanently "mobile" on every device — the reason
  // a laptop got the 390px phone layout. The dev harness's Mobile/Desktop
  // buttons still work: they set an explicit override that wins over the
  // media query, which is the whole point of being able to preview the
  // other layout on one machine.
  const isDesktop = useIsDesktop();
  const [breakpointOverride, setBreakpointOverride] = useState<Breakpoint | null>(null);
  const breakpoint: Breakpoint = breakpointOverride ?? (isDesktop ? 'desktop' : 'mobile');

  useEffect(() => {
    let cancelled = false;

    async function applySession(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) {
          setSessionUserId(null);
          setDisplayName(null);
        }
        return;
      }
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(
            'role, admin_tier, can_override_ranking, can_access_location_history, display_name',
          )
          .eq('id', userId)
          .single();
        if (cancelled || error || !profile) return;

        setSessionUserId(userId);
        setDisplayName(profile.display_name?.trim() || null);
        setPersonaState(profile.role === 'admin' ? 'admin' : 'user');
        if (profile.admin_tier) setAdminTier(profile.admin_tier as AdminTier);
        setCanOverrideRanking(profile.can_override_ranking);
        setCanAccessLocationHistory(profile.can_access_location_history);
      } catch {
        // Network/Supabase unreachable — fall back to Guest rather than
        // crash; the dev harness or a real login can still set persona.
      }
    }

    // `hasSession` is settled from the auth call itself, before and
    // independently of the `profiles` read inside applySession — routing must
    // not depend on whether that row happens to load.
    function settle(session: { user: { id: string } } | null | undefined) {
      if (cancelled) return;
      setHasSession(Boolean(session));
      setSessionLoading(false);
      // Id only — never the email address (see src/lib/analytics.ts).
      if (session?.user.id) identify(session.user.id);
      void applySession(session?.user.id);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => settle(data.session))
      .catch(() => {
        // No session could be established (offline, bad key, project down).
        // Treat that as logged out and stop blocking the router, rather than
        // leaving `/` stuck on its loading branch forever.
        if (!cancelled) {
          setHasSession(false);
          setSessionLoading(false);
        }
      });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      settle(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const setPersona = (p: Persona) => {
    // A dev-harness override always wins over a stale real session id.
    setSessionUserId(null);
    setDisplayName(null);
    setPersonaState(p);
  };

  const signOut = async () => {
    // Local state is cleared *before* the network call, not after. Two
    // reasons: callers navigate to '/' immediately (some without awaiting),
    // and '/' reads hasSession to decide between the marketing page and the
    // app — clearing afterwards would let the redirect see a stale `true`
    // and bounce a just-logged-out person straight back into the app. It
    // also means a failed or hanging signOut request still logs you out
    // locally rather than trapping you in a session you asked to end.
    setHasSession(false);
    setSessionLoading(false);
    setSessionUserId(null);
    setDisplayName(null);
    setPersonaState('guest');
    // Unlink this browser from the person who just left, so the next
    // session's events are not attributed to them.
    resetAnalytics();
    await supabase.auth.signOut();
  };

  const value = useMemo<PersonaContextValue>(
    () => ({
      persona,
      adminTier,
      canOverrideRanking,
      canAccessLocationHistory,
      breakpoint,
      userId: sessionUserId ?? userIdForPersona(persona),
      displayName,
      hasSession,
      sessionLoading,
      setPersona,
      setAdminTier,
      setCanOverrideRanking,
      setCanAccessLocationHistory,
      setBreakpoint: setBreakpointOverride,
      signOut,
    }),
    [
      persona,
      adminTier,
      canOverrideRanking,
      canAccessLocationHistory,
      breakpoint,
      sessionUserId,
      displayName,
      hasSession,
      sessionLoading,
    ],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within a PersonaProvider');
  return ctx;
}
