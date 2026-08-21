import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Mock-gated persona/session state for Phase 2. There is no real Supabase
 * Auth session here (§4 of the Phase 2 prompt: build the UI, don't wire real
 * auth) — this is the seam every screen and route guard reads instead. Phase
 * 3 replaces this provider's internals with a real `supabase.auth` session +
 * `profiles` row read, without changing the `usePersona()` call sites.
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
  /** The user id the mock data layer scopes "own" data to, for User/Owner/Admin personas. */
  userId: string;
}

interface PersonaContextValue extends PersonaState {
  setPersona: (p: Persona) => void;
  setAdminTier: (t: AdminTier) => void;
  setCanOverrideRanking: (v: boolean) => void;
  setCanAccessLocationHistory: (v: boolean) => void;
  setBreakpoint: (b: Breakpoint) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

// Fixed ids matching Phase 1's real dev test accounts (supabase/README.md),
// so fixtures/mock data can key off the same ids Phase 3 will see for real.
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
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile');

  const setPersona = (p: Persona) => setPersonaState(p);

  const value = useMemo<PersonaContextValue>(
    () => ({
      persona,
      adminTier,
      canOverrideRanking,
      canAccessLocationHistory,
      breakpoint,
      userId: userIdForPersona(persona),
      setPersona,
      setAdminTier,
      setCanOverrideRanking,
      setCanAccessLocationHistory,
      setBreakpoint,
    }),
    [persona, adminTier, canOverrideRanking, canAccessLocationHistory, breakpoint],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within a PersonaProvider');
  return ctx;
}
