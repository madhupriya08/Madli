import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { SearchProvider, useSearch, type SearchState } from '../../lib/searchState';
import { FiltersScreen } from './FiltersScreen';
import { AppliedFilterChips } from './AppliedFilterChips';

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

function StateProbe() {
  const { search } = useSearch();
  return <div data-testid="probe">{JSON.stringify(search)}</div>;
}

function probe(): SearchState {
  return JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as SearchState;
}

function Harness() {
  return (
    <PersonaProvider>
      <SearchProvider>
        <MemoryRouter initialEntries={['/filters']}>
          <Routes>
            <Route
              path="/filters"
              element={
                <>
                  <FiltersScreen />
                  <StateProbe />
                </>
              }
            />
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

describe('FiltersScreen — Phase 6 §4: one combined edit surface for intake + filter answers', () => {
  it('shows the S15 intake questions (Who, Occasion, hard constraint) alongside the S16 filter groups', async () => {
    seed({ door: 'eat' });
    render(<Harness />);

    expect(await screen.findByRole('heading', { name: 'Who is it for?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "What's the occasion?" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your one hard constraint' })).toBeInTheDocument();
    // Still there — this used to be the only thing "Edit filters" opened.
    expect(screen.getByRole('heading', { name: 'Vibe' })).toBeInTheDocument();
  });

  it('picking an intake answer here actually writes to the same search state results reads', async () => {
    seed({ door: 'eat' });
    render(<Harness />);

    await userEvent.click(await screen.findByText('Couple', { exact: true }));
    expect(probe().who).toBe('Couple');

    await userEvent.click(screen.getByText('Date', { exact: true }));
    expect(probe().occasion).toBe('Date');

    // Hard constraint defaults to "Time window" — switch to Drive time and pick a preset.
    await userEvent.click(screen.getByRole('tab', { name: 'Drive time' }));
    await userEvent.click(screen.getByText('20 min', { exact: true }));
    expect(probe().driveTimePreset).toBe('20 min');
  });

  it('clicking an applied "who" chip on results reaches the same combined screen as "Edit filters" — not a second, disconnected path', async () => {
    // Regression for the original bug: AppliedFilterChips used to send the
    // who/occasion/constraint chips to /intake and everything else (plus the
    // catch-all "Edit filters" tag) to /filters — two disconnected edit
    // paths, one of which (/filters) never showed intake answers at all.
    seed({ door: 'eat', who: 'Solo', occasion: 'Casual' });
    render(
      <PersonaProvider>
        <SearchProvider>
          <MemoryRouter initialEntries={['/results/eat']}>
            <Routes>
              <Route path="/results/eat" element={<AppliedFilterChips />} />
              <Route path="/filters" element={<FiltersScreen />} />
              <Route path="/intake" element={<h1>intake</h1>} />
            </Routes>
          </MemoryRouter>
        </SearchProvider>
      </PersonaProvider>,
    );

    await userEvent.click(screen.getByText('Solo', { exact: true }));

    expect(await screen.findByRole('heading', { name: 'Who is it for?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vibe' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'intake' })).not.toBeInTheDocument();
  });
});
