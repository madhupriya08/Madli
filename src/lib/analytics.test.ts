// What this app asks PostHog to do — not whether PostHog delivers it.
//
// The SDK buffers events until it has fetched remote config, so in any
// network-isolated environment nothing reaches the wire and an end-to-end
// assertion would test their transport rather than Madli's instrumentation.
// These tests mock the SDK and assert on the calls we make.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
const initMock = vi.fn();
const identifyMock = vi.fn();
const resetMock = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    init: initMock,
    capture: captureMock,
    identify: identifyMock,
    reset: resetMock,
  },
}));

async function loadAnalytics() {
  // Fresh module each time: `started` is module-level state.
  vi.resetModules();
  return import('./analytics');
}

const ORIGINAL_KEY = import.meta.env.VITE_POSTHOG_KEY;

function setKey(value: string | undefined) {
  if (value === undefined) delete (import.meta.env as Record<string, unknown>).VITE_POSTHOG_KEY;
  else (import.meta.env as Record<string, unknown>).VITE_POSTHOG_KEY = value;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  setKey(ORIGINAL_KEY);
});

describe('analytics — off unless a key is configured', () => {
  it('does not initialise or send anything without a key', async () => {
    setKey(undefined);
    const a = await loadAnalytics();

    a.initAnalytics();
    a.track('results_shown', { door: 'eat' });
    a.identify('user-123');
    a.trackPageView('/app');

    expect(initMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
    expect(identifyMock).not.toHaveBeenCalled();
    expect(a.analyticsEnabled()).toBe(false);
  });

  it('treats a blank or whitespace key as no key', async () => {
    setKey('   ');
    const a = await loadAnalytics();
    a.initAnalytics();
    expect(initMock).not.toHaveBeenCalled();
  });

  it('drops events fired before init rather than throwing', async () => {
    setKey('phc_test');
    const a = await loadAnalytics();
    a.track('pick_opened', { rank: 1 });
    expect(captureMock).not.toHaveBeenCalled();
  });
});

describe('analytics — with a key', () => {
  it('initialises once, however many times it is called', async () => {
    setKey('phc_test');
    const a = await loadAnalytics();
    a.initAnalytics();
    a.initAnalytics();
    a.initAnalytics();
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('uses privacy-conservative defaults', async () => {
    setKey('phc_test');
    const a = await loadAnalytics();
    a.initAnalytics();

    const [key, options] = initMock.mock.calls[0];
    expect(key).toBe('phc_test');
    // Madli's forms carry addresses, phone numbers and claim details, and its
    // guests never agreed to be an identity. All three of these must stay off.
    expect(options.autocapture).toBe(false);
    expect(options.disable_session_recording).toBe(true);
    expect(options.person_profiles).toBe('identified_only');
    // Page views are sent manually; the automatic one fires once and misses
    // every client-side route change after it.
    expect(options.capture_pageview).toBe(false);
  });

  it('sends named events with their properties', async () => {
    setKey('phc_test');
    const a = await loadAnalytics();
    a.initAnalytics();
    a.track('results_shown', { door: 'eat', ranked_count: 3 });

    expect(captureMock).toHaveBeenCalledWith('results_shown', {
      door: 'eat',
      ranked_count: 3,
    });
  });

  it('identifies by user id alone, and ignores an empty id', async () => {
    setKey('phc_test');
    const a = await loadAnalytics();
    a.initAnalytics();

    a.identify('');
    expect(identifyMock).not.toHaveBeenCalled();

    a.identify('10000000-0000-0000-0000-000000000002');
    expect(identifyMock).toHaveBeenCalledWith('10000000-0000-0000-0000-000000000002');
    // One argument only — no properties object that could carry an email.
    expect(identifyMock.mock.calls[0]).toHaveLength(1);
  });

  it('resets on sign-out so the next person is not the last one', async () => {
    setKey('phc_test');
    const a = await loadAnalytics();
    a.initAnalytics();
    a.resetAnalytics();
    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});

describe('page-view paths', () => {
  it('redacts a plan share token but leaves public slugs alone', async () => {
    const { redactPath } = await import('./usePageViews');
    // A shared plan URL's path segment IS the permanent share token.
    expect(redactPath('/plans/abc123-secret-token')).toBe('/plans/:token');
    expect(redactPath('/plans/abc123-secret-token/extra')).toBe('/plans/:token/extra');
    // Place slugs are public and are the whole point of having analytics.
    expect(redactPath('/places/restaurants%2Fhotel-shadab')).toBe(
      '/places/restaurants%2Fhotel-shadab',
    );
    expect(redactPath('/results/eat')).toBe('/results/eat');
  });
});
