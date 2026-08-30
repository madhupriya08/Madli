import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { SearchProvider, type SearchState } from '../../lib/searchState';
import { FiltersScreen } from './FiltersScreen';

/**
 * Phase 6 §3: verifying the design handoff's actual category-specific intent
 * for S16 (checked directly against design_handoff_madli/prototype/Madli
 * Prototype.dc.html and README.md, not assumed) — Vibe options, Kitchen and
 * Area type are door-specific; Kitchen is Eat-only, Area type is
 * Explore-only, each *absent* behind the wrong door, not merely disabled.
 * S15 (intake)'s Who/Occasion questions are door-agnostic in the design
 * handoff itself (its own whoChips/occChips never branch on door) — that is
 * confirmed intentional, not a gap, so intake is untouched here.
 */

function seed(initial: Partial<SearchState>) {
  sessionStorage.setItem('madli.search', JSON.stringify(initial));
}

function Harness() {
  return (
    <PersonaProvider>
      <SearchProvider>
        <MemoryRouter initialEntries={['/filters']}>
          <Routes>
            <Route path="/filters" element={<FiltersScreen />} />
            <Route path="/results/eat" element={<h1>results eat</h1>} />
            <Route path="/results/explore" element={<h1>results explore</h1>} />
          </Routes>
        </MemoryRouter>
      </SearchProvider>
    </PersonaProvider>
  );
}

describe('FiltersScreen — S16 door-specific groups', () => {
  it('Eat door: shows Kitchen, hides Area type, and offers the Eat vibe set', async () => {
    seed({ door: 'eat' });
    render(<Harness />);

    expect(await screen.findByRole('heading', { name: 'Kitchen' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Area type' })).not.toBeInTheDocument();
    expect(screen.getByText('Michelin-style', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Historical', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('Skip long waits')).toBeInTheDocument();
  });

  it('Explore door: shows Area type, hides Kitchen entirely, and offers the Explore vibe set', async () => {
    seed({ door: 'explore' });
    render(<Harness />);

    expect(await screen.findByRole('heading', { name: 'Area type' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kitchen' })).not.toBeInTheDocument();
    expect(screen.getByText('Historical', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Michelin-style', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('Avoid crowded times')).toBeInTheDocument();
  });
});
