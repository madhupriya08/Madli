import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  SearchProvider,
  useSearch,
  radiusFromConstraint,
  distanceUnitForCountry,
  usesAbsoluteBudgetLabels,
  budgetCapOptionsFor,
  budgetOptionsFor,
  priceLevelsForBudgetLabel,
  distancePresetsFor,
  formatDistanceKm,
  filterSliceOf,
  isFilterSliceAtDefaults,
  DEFAULT_STATE,
} from './searchState';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SearchProvider>{children}</SearchProvider>
);

describe('searchState', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps the deprecated single `vibe` in step with the multi-select `vibes`', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => result.current.setSearch({ vibes: ['Tiffin', 'Diner'] }));
    expect(result.current.search.vibes).toEqual(['Tiffin', 'Diner']);
    // pickReason and the analytics payload still read the single field.
    expect(result.current.search.vibe).toBe('Tiffin');

    act(() => result.current.setSearch({ vibes: [] }));
    expect(result.current.search.vibe).toBeNull();
  });

  it('migrates an older stored blob that only had a single vibe', () => {
    sessionStorage.setItem(
      'madli.search',
      JSON.stringify({ door: 'eat', vibe: 'Date night', constraintMode: 'time' }),
    );
    const { result } = renderHook(() => useSearch(), { wrapper });
    expect(result.current.search.vibes).toEqual(['Date night']);
    expect(result.current.search.vibe).toBe('Date night');
  });

  it('keeps all three hard-constraint answers independent — switching tabs does not erase the others', () => {
    // Matches the prototype's own state shape: choosing a tab only changes
    // which one is active, it never clears what was picked under the others.
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => result.current.setSearch({ constraintMode: 'time', timeWindow: 'Right now' }));
    act(() => result.current.setSearch({ constraintMode: 'drive', driveTimePreset: '20 min' }));

    expect(result.current.search.constraintMode).toBe('drive');
    expect(result.current.search.driveTimePreset).toBe('20 min');
    // Still there, just no longer the active mode.
    expect(result.current.search.timeWindow).toBe('Right now');
  });

  it('persists across a remount — e.g. a guest reloading results mid-session', () => {
    // This is the whole of item 6's guest filter-persistence requirement:
    // SearchProvider persists to sessionStorage for every persona alike, so
    // a Guest reloading /results keeps their filters exactly like a signed-in
    // User does — nothing persona-specific needed adding on top of it.
    const first = renderHook(() => useSearch(), { wrapper });
    act(() =>
      first.result.current.setSearch({
        vibes: ['Date night'],
        budget: '₹300–600',
        allowsPets: true,
      }),
    );
    first.unmount();

    const second = renderHook(() => useSearch(), { wrapper });
    expect(second.result.current.search.vibes).toEqual(['Date night']);
    expect(second.result.current.search.budget).toBe('₹300–600');
    expect(second.result.current.search.allowsPets).toBe(true);
  });

  it('resetFilters clears only what S16 owns, leaving the S15 answers and origin alone', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() =>
      result.current.setSearch({
        who: 'Couple',
        occasion: 'Date',
        areaText: 'Jubilee Hills',
        center: { lat: 17.43, lng: 78.41 },
        centerSource: 'geolocation',
        vibes: ['Diner'],
        budget: '₹300–600',
        distanceKm: '5',
        allowsPets: true,
        openNow: true,
      }),
    );

    act(() => result.current.resetFilters());

    expect(result.current.search.vibes).toEqual([]);
    expect(result.current.search.budget).toBeNull();
    expect(result.current.search.distanceKm).toBe('');
    expect(result.current.search.allowsPets).toBe(false);
    expect(result.current.search.openNow).toBe(false);
    // Untouched: these are not filters, and clearing them would silently
    // throw away the origin the person granted.
    expect(result.current.search.who).toBe('Couple');
    expect(result.current.search.occasion).toBe('Date');
    expect(result.current.search.areaText).toBe('Jubilee Hills');
    expect(result.current.search.centerSource).toBe('geolocation');
  });
});

describe('radiusFromConstraint', () => {
  it("S16's own Distance filter wins outright when set", () => {
    expect(
      radiusFromConstraint({ constraintMode: 'drive', driveTimePreset: '45 min', distanceKm: '2' }),
    ).toBe(2000);
  });

  it('falls back to the drive-time preset, one-way, when no explicit distance is set', () => {
    // 20 min at 20 km/h, one-way (not a round trip): 1/3 hour × 20 km/h.
    expect(
      radiusFromConstraint({ constraintMode: 'drive', driveTimePreset: '20 min', distanceKm: '' }),
    ).toBeCloseTo(6667, -1);
  });

  it('a time window or a budget carries no distance — falls back to the default', () => {
    expect(
      radiusFromConstraint({ constraintMode: 'time', driveTimePreset: null, distanceKm: '' }),
    ).toBe(3000);
    expect(
      radiusFromConstraint({ constraintMode: 'budget', driveTimePreset: null, distanceKm: '' }),
    ).toBe(3000);
  });

  it('clamps to the 50 km Places ceiling instead of erroring', () => {
    expect(
      radiusFromConstraint({ constraintMode: 'drive', driveTimePreset: '3 hours', distanceKm: '' }),
    ).toBe(50_000);
  });

  it('falls back to the default rather than a zero radius on junk distance input', () => {
    expect(
      radiusFromConstraint({ constraintMode: 'time', driveTimePreset: null, distanceKm: '-4' }),
    ).toBe(3000);
  });
});

describe('locale-aware distance and budget labels', () => {
  it('only the mile-measuring countries get miles — everywhere else, including unset, is km', () => {
    expect(distanceUnitForCountry('US')).toBe('mi');
    expect(distanceUnitForCountry('GB')).toBe('mi');
    expect(distanceUnitForCountry('IN')).toBe('km');
    expect(distanceUnitForCountry('FR')).toBe('km');
    expect(distanceUnitForCountry(null)).toBe('km');
  });

  it('only India (or nothing chosen yet) gets real absolute rupee thresholds', () => {
    expect(usesAbsoluteBudgetLabels('IN')).toBe(true);
    expect(usesAbsoluteBudgetLabels(null)).toBe(true);
    expect(usesAbsoluteBudgetLabels('US')).toBe(false);
    expect(usesAbsoluteBudgetLabels('FR')).toBe(false);
  });

  it('budget cap chips are real rupee amounts for India, real amounts in other currencies where chosen, relative $-tiers only where neither exists', () => {
    expect(budgetCapOptionsFor('IN')).toEqual([
      'Under ₹150 a head',
      'Under ₹400 a head',
      'Under ₹800 a head',
      'Price is not the issue',
    ]);
    // Phase 8 §6: US (and other curated currencies) now get real numbers too.
    expect(budgetCapOptionsFor('US')).toEqual([
      'Under $10 a head',
      'Under $25 a head',
      'Under $50 a head',
      'Price is not the issue',
    ]);
    expect(budgetCapOptionsFor('GB')).toEqual([
      'Under £8 a head',
      'Under £20 a head',
      'Under £40 a head',
      'Price is not the issue',
    ]);
    // A country with no curated currency at all still falls back to the
    // relative notation rather than an invented, unverifiable number.
    expect(budgetCapOptionsFor('ZA')).toEqual(['$', '$$', '$$$', '$$$$', 'Price is not the issue']);
  });

  it('the S16 budget band is the same India/currency/relative split', () => {
    expect(budgetOptionsFor('IN')).toEqual(['Under ₹150', '₹150–300', '₹300–600', '₹600+']);
    expect(budgetOptionsFor('US')).toEqual(['Under $10', '$10–25', '$25–50', '$50+']);
    expect(budgetOptionsFor('ZA')).toEqual(['$', '$$', '$$$', '$$$$']);
  });

  it('Phase 8 §6: a real-currency cap/band label resolves to the same Google price-level tiers regardless of currency', () => {
    expect(priceLevelsForBudgetLabel('Under ₹150 a head', 'IN', 'cap')).toEqual([1]);
    expect(priceLevelsForBudgetLabel('Under ₹800 a head', 'IN', 'cap')).toEqual([1, 2, 3]);
    expect(priceLevelsForBudgetLabel('Price is not the issue', 'IN', 'cap')).toEqual([]);
    expect(priceLevelsForBudgetLabel('Under $10 a head', 'US', 'cap')).toEqual([1]);
    expect(priceLevelsForBudgetLabel('Under $50 a head', 'US', 'cap')).toEqual([1, 2, 3]);
    expect(priceLevelsForBudgetLabel('₹300–600', 'IN', 'band')).toEqual([2, 3]);
    expect(priceLevelsForBudgetLabel('$25–50', 'US', 'band')).toEqual([2, 3]);
  });

  it('Phase 8 §6: the relative $ notation resolves the same way it always did, for a country with no curated currency', () => {
    expect(priceLevelsForBudgetLabel('$', 'ZA', 'cap')).toEqual([1]);
    expect(priceLevelsForBudgetLabel('$$$$', 'ZA', 'band')).toEqual([3, 4]);
    expect(priceLevelsForBudgetLabel('Price is not the issue', 'ZA', 'cap')).toEqual([]);
    expect(priceLevelsForBudgetLabel(null, 'ZA', 'cap')).toEqual([]);
  });

  it('distance presets are round km numbers for most places, round mile numbers (stored as their km equivalent) for mile countries', () => {
    expect(distancePresetsFor('IN')).toEqual([
      { label: 'Under 2 km', km: '2' },
      { label: 'Under 5 km', km: '5' },
      { label: 'Under 15 km', km: '15' },
      { label: 'Any distance', km: null },
    ]);
    const usPresets = distancePresetsFor('US');
    expect(usPresets.map((p) => p.label)).toEqual([
      'Under 1 mile',
      'Under 3 miles',
      'Under 10 miles',
      'Any distance',
    ]);
    // Stored value is still real kilometres — the canonical unit radius math uses.
    expect(usPresets[0].km).toBe(String(Math.round(1 * 1.60934 * 10) / 10));
    expect(usPresets[3].km).toBeNull();
  });

  it('formats a stored km figure back into the locale-correct label', () => {
    expect(formatDistanceKm('5', 'IN')).toBe('5 km');
    expect(formatDistanceKm('5', null)).toBe('5 km');
    expect(formatDistanceKm('8', 'US')).toBe(`${Math.round((8 / 1.60934) * 10) / 10} mi`);
    // Non-numeric input is returned unchanged rather than blowing up.
    expect(formatDistanceKm('', 'IN')).toBe('');
  });
});

describe('filterSliceOf / isFilterSliceAtDefaults — P5 §5 account persistence', () => {
  it('pulls out exactly the S16 filter fields, nothing from S15 or the origin', () => {
    const slice = filterSliceOf({
      ...DEFAULT_STATE,
      who: 'Couple',
      areaText: 'Jubilee Hills',
      vibes: ['Diner'],
      vibe: 'Diner',
      budget: '₹300–600',
    });
    expect(slice).toEqual({
      vibes: ['Diner'],
      vibe: 'Diner',
      budget: '₹300–600',
      kitchen: null,
      distanceKm: '',
      allowsPets: false,
      familyFriendly: false,
      coupleFriendly: false,
      openLate: false,
      waitCare: false,
      openNow: false,
      areaType: null,
    });
    // who/areaText are not part of the slice at all.
    expect(slice).not.toHaveProperty('who');
    expect(slice).not.toHaveProperty('areaText');
  });

  it('is true only when every filter field is still at its default', () => {
    expect(isFilterSliceAtDefaults(DEFAULT_STATE)).toBe(true);
    expect(isFilterSliceAtDefaults({ ...DEFAULT_STATE, budget: '₹300–600' })).toBe(false);
    // A non-filter field changing (who) does not count as "touched".
    expect(isFilterSliceAtDefaults({ ...DEFAULT_STATE, who: 'Couple' })).toBe(true);
  });
});
