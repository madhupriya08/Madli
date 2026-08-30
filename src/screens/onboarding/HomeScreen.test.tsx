import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { SearchProvider, useSearch } from '../../lib/searchState';
import { HomeScreen } from './HomeScreen';

/**
 * The Gem of the town banner used to live only on the marketing landing
 * page, shown to every anonymous visitor regardless of where they actually
 * are — the prototype's own S7 (Home) carries this banner instead, scoped
 * to the real selected area. These assert that scoping: near the one seeded
 * gem (Subhan Bakery, Nampally) it shows; far from it, it honestly doesn't.
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock('../../data/areaCounts', () => ({
  useAreaDoorCounts: () => ({ data: undefined }),
}));

function SeedArea({ areaText, center }: { areaText: string; center: { lat: number; lng: number } }) {
  const { setSearch } = useSearch();
  return (
    <button onClick={() => setSearch({ areaText, center, centerSource: 'area' })}>
      seed {areaText}
    </button>
  );
}

function Harness({ areaText, center }: { areaText: string; center: { lat: number; lng: number } }) {
  return (
    <PersonaProvider>
      <SearchProvider>
        <MemoryRouter initialEntries={['/app']}>
          <SeedArea areaText={areaText} center={center} />
          <Routes>
            <Route path="/app" element={<HomeScreen />} />
            <Route
              path="/places/:slug"
              element={<h1>Place detail</h1>}
            />
          </Routes>
        </MemoryRouter>
      </SearchProvider>
    </PersonaProvider>
  );
}

describe('HomeScreen — Gem of the town, scoped to the real selected area', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows the gem near a Hyderabad-adjacent area (Jubilee Hills, within range of Nampally)', async () => {
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4325, lng: 78.4074 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));

    expect(await screen.findByText('Gem of the town · this week')).toBeInTheDocument();
    expect(screen.getByText('Subhan Bakery')).toBeInTheDocument();
  });

  it('does not show a gem for a location nowhere near the one seeded gem', async () => {
    render(<Harness areaText="Bandra, Mumbai" center={{ lat: 19.0596, lng: 72.8295 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Bandra, Mumbai' }));

    await screen.findByRole('heading', { name: 'Where to start?' });
    expect(screen.queryByText('Gem of the town · this week')).not.toBeInTheDocument();
  });

  it('tapping the gem banner opens that place\'s own page', async () => {
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4325, lng: 78.4074 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));

    await userEvent.click(await screen.findByText('Subhan Bakery'));
    expect(await screen.findByRole('heading', { name: 'Place detail' })).toBeInTheDocument();
  });
});
