import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useIsDesktop } from '../lib/useBreakpoint';

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
        if (!cancelled) setSessionUserId(null);
        return;
      }
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, admin_tier, can_override_ranking, can_access_location_history')
          .eq('id', userId)
          .single();
        if (cancelled || error || !profile) return;

        setSessionUserId(userId);
        setPersonaState(profile.role === 'admin' ? 'admin' : 'user');
        if (profile.admin_tier) setAdminTier(profile.admin_tier as AdminTier);
        setCanOverrideRanking(profile.can_override_ranking);
        setCanAccessLocationHistory(profile.can_access_location_history);
      } catch {
        // Network/Supabase unreachable — fall back to Guest rather than
        // crash; the dev harness or a real login can still set persona.
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session?.user.id))
      .catch(() => {});
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user.id);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const setPersona = (p: Persona) => {
    // A dev-harness override always wins over a stale real session id.
    setSessionUserId(null);
    setPersonaState(p);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSessionUserId(null);
    setPersonaState('guest');
  };

  const value = useMemo<PersonaContextValue>(
    () => ({
      persona,
      adminTier,
      canOverrideRanking,
      canAccessLocationHistory,
      breakpoint,
      userId: sessionUserId ?? userIdForPersona(persona),
      setPersona,
      setAdminTier,
      setCanOverrideRanking,
      setCanAccessLocationHistory,
      setBreakpoint: setBreakpointOverride,
      signOut,
    }),
    [persona, adminTier, canOverrideRanking, canAccessLocationHistory, breakpoint, sessionUserId],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within a PersonaProvider');
  return ctx;
}
