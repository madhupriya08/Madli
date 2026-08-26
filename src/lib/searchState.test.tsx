import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SearchProvider, useSearch, radiusFromConstraint } from './searchState';

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

  it('migrates an older stored blob that only had constraintValue', () => {
    sessionStorage.setItem(
      'madli.search',
      JSON.stringify({ door: 'eat', constraintMode: 'radius', constraintValue: '7' }),
    );
    const { result } = renderHook(() => useSearch(), { wrapper });
    expect(result.current.search.radiusKm).toBe('7');
    expect(result.current.radiusMeters).toBe(7000);
  });

  it('switches constraint mode to whichever field was edited last', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => result.current.setSearch({ timeMinutes: '30' }));
    expect(result.current.search.constraintMode).toBe('time');

    act(() => result.current.setSearch({ radiusKm: '4' }));
    expect(result.current.search.constraintMode).toBe('radius');
    expect(result.current.radiusMeters).toBe(4000);

    // Both values survive — they are independent fields, not one input whose
    // label flips.
    expect(result.current.search.timeMinutes).toBe('30');
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
        allowsPets: true,
        openNow: true,
      }),
    );

    act(() => result.current.resetFilters());

    expect(result.current.search.vibes).toEqual([]);
    expect(result.current.search.budget).toBeNull();
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
  it('treats minutes as a round trip, so half the budget is the outbound leg', () => {
    // 30 min budget → 15 min out → 5 km at 20 km/h.
    expect(radiusFromConstraint('time', '30')).toBe(5000);
  });

  it('falls back to a default rather than a zero radius on junk input', () => {
    expect(radiusFromConstraint('radius', '')).toBe(3000);
    expect(radiusFromConstraint('radius', '-4')).toBe(3000);
  });

  it('clamps to the 50 km Places ceiling instead of erroring', () => {
    expect(radiusFromConstraint('radius', '400')).toBe(50_000);
  });
});
