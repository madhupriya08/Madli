import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GuestSessionProvider, useGuestSession } from './guestSession';
import { appConfig } from '../fixtures/appConfig';

function wrapper({ children }: { children: ReactNode }) {
  return <GuestSessionProvider>{children}</GuestSessionProvider>;
}

describe('useGuestSession — search counter and paywall', () => {
  it('does not paywall searches before the configured threshold', () => {
    const { result } = renderHook(() => useGuestSession(), { wrapper });
    for (let i = 1; i < appConfig.guestPaywallAtSearch; i++) {
      let outcome!: { paywalled: boolean; searchNumber: number };
      act(() => {
        outcome = result.current.recordSearch();
      });
      expect(outcome.paywalled).toBe(false);
      expect(outcome.searchNumber).toBe(i);
    }
  });

  it('trips the paywall exactly at the configured search count, shared across both doors', () => {
    const { result } = renderHook(() => useGuestSession(), { wrapper });
    let outcome!: { paywalled: boolean; searchNumber: number };
    for (let i = 0; i < appConfig.guestPaywallAtSearch; i++) {
      act(() => {
        outcome = result.current.recordSearch();
      });
    }
    expect(outcome.paywalled).toBe(true);
    expect(outcome.searchNumber).toBe(appConfig.guestPaywallAtSearch);
  });
});

describe('useGuestSession — "None of these"', () => {
  it('allows exactly one free use, then reports the second as an intercept', () => {
    const { result } = renderHook(() => useGuestSession(), { wrapper });
    let first!: boolean;
    let second!: boolean;
    act(() => {
      first = result.current.useFreeNoneOfThese();
    });
    act(() => {
      second = result.current.useFreeNoneOfThese();
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});

describe('useGuestSession — reject list', () => {
  it('keeps rejected places from reappearing for the rest of the session', () => {
    const { result } = renderHook(() => useGuestSession(), { wrapper });
    expect(result.current.isRejected('place-1')).toBe(false);

    act(() => {
      result.current.rejectPlaces(['place-1', 'place-2']);
    });

    expect(result.current.isRejected('place-1')).toBe(true);
    expect(result.current.isRejected('place-2')).toBe(true);
    expect(result.current.isRejected('place-3')).toBe(false);
  });

  it('accumulates rejections across multiple calls instead of replacing the list', () => {
    const { result } = renderHook(() => useGuestSession(), { wrapper });
    act(() => {
      result.current.rejectPlaces(['place-1']);
    });
    act(() => {
      result.current.rejectPlaces(['place-2']);
    });
    expect(result.current.isRejected('place-1')).toBe(true);
    expect(result.current.isRejected('place-2')).toBe(true);
  });
});

describe('useGuestSession — local or visitor', () => {
  it('starts unanswered and holds whichever answer is set', () => {
    const { result } = renderHook(() => useGuestSession(), { wrapper });
    expect(result.current.residentStatus).toBeNull();

    act(() => {
      result.current.setResidentStatus('local');
    });
    expect(result.current.residentStatus).toBe('local');

    act(() => {
      result.current.setResidentStatus('visitor');
    });
    expect(result.current.residentStatus).toBe('visitor');
  });
});

describe('useGuestSession — reset', () => {
  it('clears the counter, reject list, free-use flag, and local/visitor answer', () => {
    const { result } = renderHook(() => useGuestSession(), { wrapper });
    act(() => {
      result.current.recordSearch();
      result.current.rejectPlaces(['place-1']);
      result.current.useFreeNoneOfThese();
      result.current.setResidentStatus('local');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.searchCount).toBe(0);
    expect(result.current.isRejected('place-1')).toBe(false);
    expect(result.current.noneOfTheseUsedOnce).toBe(false);
    expect(result.current.residentStatus).toBeNull();
  });
});
