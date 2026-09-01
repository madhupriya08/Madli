import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { MyRankedListScreen } from './MyRankedListScreen';

/**
 * P10 §6: a person's Google-place rankings (from onboarding, or the new
 * "I've been here" button on a real place's detail page) used to never show
 * up here at all — only the 17 seeded catalogue places did. They now render
 * as their own door-scoped column(s) alongside the catalogue's per-category
 * columns, so nothing a person ranks disappears from their own list.
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock('../../data/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../data/hooks')>('../../data/hooks');
  return {
    ...actual,
    useVisibleRankedEntries: () => ({
      data: [
        { id: 'e1', placeId: 'catalogue-1', categoryId: '00000000-0000-0000-0000-0000000000c1', position: 1 },
      ],
    }),
  };
});

vi.mock('../../fixtures/places', async () => {
  const actual = await vi.importActual<typeof import('../../fixtures/places')>('../../fixtures/places');
  return {
    ...actual,
    placeById: (id: string) => (id === 'catalogue-1' ? { id, name: 'Cafe Bahar' } : undefined),
  };
});

vi.mock('../../data/googleRankings', async () => {
  const actual =
    await vi.importActual<typeof import('../../data/googleRankings')>('../../data/googleRankings');
  return {
    ...actual,
    useMyGoogleRankings: () => ({
      data: [
        {
          id: 'g1',
          googlePlaceId: 'google-1',
          placeName: 'Testville Diner',
          door: 'eat',
          tier: 'loved',
          raterType: 'visitor',
          position: 1,
          areaText: null,
          types: ['restaurant'],
        },
      ],
    }),
  };
});

function Harness() {
  return (
    <PersonaProvider>
      <MemoryRouter initialEntries={['/my-list']}>
        <MyRankedListScreen />
      </MemoryRouter>
    </PersonaProvider>
  );
}

describe('MyRankedListScreen — merges catalogue and Google rankings', () => {
  it('shows the catalogue category column, and switching tabs reveals the Google door column', async () => {
    render(<Harness />);

    // Mobile layout (the default breakpoint here) shows one column at a
    // time behind tabs — the category heading (an <h3>) and its own tab
    // (a <button role="tab">) legitimately share the same text.
    expect(await screen.findByRole('heading', { name: 'Breakfast and tiffin' })).toBeInTheDocument();
    expect(screen.getByText('Cafe Bahar')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Eat — nearby places' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Eat — nearby places' }));
    expect(await screen.findByRole('heading', { name: 'Eat — nearby places' })).toBeInTheDocument();
    expect(screen.getByText('Testville Diner')).toBeInTheDocument();
  });
});
