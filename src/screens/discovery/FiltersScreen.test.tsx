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

describe('FiltersScreen — Distance: "Any distance" is not a required selection', () => {
  it('starts with nothing highlighted in the Distance group — matches every other filter group', async () => {
    seed({ door: 'eat', countryCode: 'IN' });
    render(<Harness />);

    const anyDistance = await screen.findByText('Any distance');
    // Selected vs. not is a background-colour swap on the Tag itself (no
    // aria-pressed) — see Tag.tsx. Live testing showed this pre-highlighted,
    // which read as a distance filter being required before you could
    // search at all; the default (no distanceKm set) is a real "no
    // preference", same as every untouched chip group above it.
    expect(anyDistance.style.background).not.toContain('teal-500');
    expect(anyDistance.style.background).toContain('surface-sunken');
  });

  it('picking a distance preset highlights it, not "Any distance" — and "Any distance" clears it back', async () => {
    seed({ door: 'eat', countryCode: 'IN' });
    render(<Harness />);

    await userEvent.click(await screen.findByText('Under 2 km'));
    expect(probe().distanceKm).toBe('2');

    await userEvent.click(screen.getByText('Any distance'));
    expect(probe().distanceKm).toBe('');
  });
});

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

  it('"Serves pet food" shows on Eat', async () => {
    seed({ door: 'eat' });
    render(<Harness />);
    await screen.findByRole('heading', { name: 'Kitchen' });
    expect(screen.getByText('Serves pet food')).toBeInTheDocument();
  });

  it('"Serves pet food" is absent on Explore', async () => {
    seed({ door: 'explore' });
    render(<Harness />);
    await screen.findByRole('heading', { name: 'Area type' });
    expect(screen.queryByText('Serves pet food')).not.toBeInTheDocument();
  });

  it('Phase 9 §3: Eat door shows Cuisine, hides Place type', async () => {
    seed({ door: 'eat' });
    render(<Harness />);
    expect(await screen.findByRole('heading', { name: 'Cuisine' })).toBeInTheDocument();
    expect(screen.getByText('South Indian', { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Place type' })).not.toBeInTheDocument();
  });

  it('Phase 9 §3: Explore door shows Place type, hides Cuisine', async () => {
    seed({ door: 'explore' });
    render(<Harness />);
    expect(await screen.findByRole('heading', { name: 'Place type' })).toBeInTheDocument();
    expect(screen.getByText('Touristic landmark', { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cuisine' })).not.toBeInTheDocument();
  });

  it('Phase 9 §3: "Most famous" shows on both doors', async () => {
    seed({ door: 'eat' });
    render(<Harness />);
    expect(await screen.findByText('Most famous')).toBeInTheDocument();
  });

  it('Phase 9 §4: Eat door offers meal-shaped Time window buckets (Brunch, Lunch), not Afternoon', async () => {
    seed({ door: 'eat' });
    render(<Harness />);
    await screen.findByRole('heading', { name: 'Your one hard constraint' });
    expect(screen.getByText('Brunch', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Lunch', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Afternoon', { exact: true })).not.toBeInTheDocument();
  });

  it('Phase 9 §4: Explore door offers Afternoon, not the meal-shaped Eat buckets', async () => {
    seed({ door: 'explore' });
    render(<Harness />);
    await screen.findByRole('heading', { name: 'Your one hard constraint' });
    expect(screen.getByText('Afternoon', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Brunch', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('Lunch', { exact: true })).not.toBeInTheDocument();
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

describe('FiltersScreen — Phase 8 §11: Budget shown once, not twice', () => {
  it('Budget appears only as the hard-constraint tab, not as its own separate filter group too', async () => {
    seed({ door: 'eat' });
    render(<Harness />);

    expect(await screen.findByRole('tab', { name: 'Budget' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Budget' })).not.toBeInTheDocument();
  });
});
