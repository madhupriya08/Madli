import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SearchProvider, useSearch, type SearchState } from '../../lib/searchState';
import { AppliedFilterChips } from './AppliedFilterChips';

/**
 * S16's rule: applied filters leave the panel as editable chips on results.
 * These assert the two things that makes it useful — that every answer is
 * actually visible, and that clearing one really changes the search state the
 * discovery query is keyed on (rather than only hiding a chip).
 */

/**
 * Seeded through sessionStorage rather than a setSearch call from a child:
 * SearchProvider reads that key in its useState initialiser, so the state is
 * already correct on first paint. Writing it from a child's render would
 * update a parent mid-render, which React rightly complains about.
 */
function seed(initial: Partial<SearchState>) {
  sessionStorage.setItem('madli.search', JSON.stringify(initial));
}

function Harness() {
  return (
    <SearchProvider>
      <MemoryRouter initialEntries={['/results/eat']}>
        <Routes>
          <Route
            path="/results/eat"
            element={
              <>
                <AppliedFilterChips />
                <StateProbe />
              </>
            }
          />
          <Route path="*" element={<div>navigated away</div>} />
        </Routes>
      </MemoryRouter>
    </SearchProvider>
  );
}

function StateProbe() {
  const { search } = useSearch();
  return <div data-testid="probe">{JSON.stringify(search)}</div>;
}

function probe(): SearchState {
  return JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as SearchState;
}

describe('AppliedFilterChips — S16 filters leaving as chips on results', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows a chip for every answer the person gave', () => {
    seed({
      door: 'eat',
      who: 'Couple',
      occasion: 'Date',
      radiusKm: '5',
      constraintMode: 'radius',
      areaText: 'Jubilee Hills',
      vibes: ['Diner', 'Tiffin'],
      budget: '₹300–600',
      kitchen: 'Veg available',
      allowsPets: true,
    });
    render(<Harness />);

    for (const label of [
      'Couple',
      'Date',
      'Within 5 km',
      'Jubilee Hills',
      'Diner',
      'Tiffin',
      '₹300–600',
      'Veg available',
      'Allows pets',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('says so plainly when nothing is applied, rather than rendering an empty row', () => {
    seed({ door: 'eat' });
    render(<Harness />);
    expect(screen.getByText('No filters applied.')).toBeInTheDocument();
    expect(screen.getByText('Add filters')).toBeInTheDocument();
  });

  it('clearing a chip removes that one answer from the search state', async () => {
    const user = userEvent.setup();
    seed({ door: 'eat', who: 'Couple', vibes: ['Diner', 'Tiffin'] });
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove Diner' }));

    const after = probe();
    // Only the one chip goes; the rest of the answers survive.
    expect(after.vibes).toEqual(['Tiffin']);
    expect(after.who).toBe('Couple');
    expect(screen.queryByText('Diner')).not.toBeInTheDocument();
  });

  it('clearing the area also drops the coordinates that were resolved for it', async () => {
    const user = userEvent.setup();
    seed({
      door: 'eat',
      areaText: 'Banjara Hills',
      areaPlaceId: 'place-1',
      center: { lat: 17.41, lng: 78.44 },
      centerSource: 'area',
    });
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove Banjara Hills' }));

    const after = probe();
    expect(after.areaText).toBe('');
    // Keeping a centre for an area nobody asked for would clip results around
    // somewhere the person never named.
    expect(after.center).toBeNull();
    expect(after.centerSource).toBeNull();
  });

  it('keeps a geolocation origin when the typed area is cleared', async () => {
    const user = userEvent.setup();
    seed({
      door: 'eat',
      areaText: 'Banjara Hills',
      center: { lat: 17.41, lng: 78.44 },
      centerSource: 'geolocation',
    });
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove Banjara Hills' }));

    const after = probe();
    expect(after.areaText).toBe('');
    // The device location was not derived from the typed area, so it stays.
    expect(after.centerSource).toBe('geolocation');
  });

  it('only offers the door-relevant chips', () => {
    seed({ door: 'explore', kitchen: 'Non-veg', areaType: 'Outdoor', waitCare: true });
    render(<Harness />);

    expect(screen.getByText('Outdoor')).toBeInTheDocument();
    // Explore has no kitchen to describe.
    expect(screen.queryByText('Non-veg')).not.toBeInTheDocument();
    // The wait switch is worded per door.
    expect(screen.getByText('Avoid crowded times')).toBeInTheDocument();
  });
});
