import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { LogVisitComparisonScreen } from './LogVisitComparisonScreen';

/**
 * P13 §6: re-ranking a catalogue place (fn_log_ranked_visit now accepts
 * this instead of refusing it — 20260904100000_rerank_catalogue_visit.sql)
 * must never offer the place being re-ranked as its own comparison target:
 * it is still in the live list until the RPC's own transaction removes it,
 * so a naive "current #1 in category" read would include it whenever the
 * place already sits at #1 — exactly the re-rank case, since a place that
 * has only ever been ranked once is always its own category's #1.
 */

const useComparisonTargetsMock = vi.fn();
vi.mock('../../data/hooks', () => ({
  useComparisonTargets: (...args: unknown[]) => useComparisonTargetsMock(...args),
  useLogRankedVisit: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

function Harness({ placeId, tier = 'loved' }: { placeId: string; tier?: string }) {
  return (
    <PersonaProvider>
      <MemoryRouter initialEntries={[{ pathname: '/log-visit/compare', state: { placeId, tier } }]}>
        <Routes>
          <Route path="/log-visit/compare" element={<LogVisitComparisonScreen />} />
          <Route path="/log-visit" element={<h1>log-visit route</h1>} />
        </Routes>
      </MemoryRouter>
    </PersonaProvider>
  );
}

describe('LogVisitComparisonScreen — P13 §6: re-ranking excludes the place from its own comparison targets', () => {
  beforeEach(() => {
    useComparisonTargetsMock.mockReset();
  });

  it('passes the place being ranked as the exclusion id to useComparisonTargets', async () => {
    useComparisonTargetsMock.mockReturnValue({ data: {}, isLoading: false });
    // A real catalogue fixture slug — see src/fixtures/places.ts.
    render(<Harness placeId="00000000-0000-0000-0000-0000000000f6" />);

    await screen.findByText(/is the first place you've ranked in this category/);
    expect(useComparisonTargetsMock).toHaveBeenCalledWith(
      '',
      expect.any(String),
      '00000000-0000-0000-0000-0000000000f6',
    );
  });
});
