import posthog from 'posthog-js';

/**
 * Product analytics, off by default.
 *
 * Nothing initialises and nothing is sent unless VITE_POSTHOG_KEY is set, so
 * a checkout without a key — or a test run, or an E2E suite — is completely
 * inert rather than firing events at somebody's project.
 *
 * Madli holds location history, a real privacy-settings screen and a
 * delete-my-account flow, so the defaults here are deliberately conservative:
 *
 *  - `person_profiles: 'identified_only'` — anonymous browsing does not create
 *    a person profile. Guests are most of the traffic and none of them agreed
 *    to be a tracked identity.
 *  - autocapture off — Madli's inputs carry addresses, phone numbers and
 *    business-claim details. Capturing every click and field by default would
 *    hoover those up. Events here are named explicitly instead, so what leaves
 *    the browser is a decision someone made, not a default.
 *  - session recording off — same reason, more so.
 *  - `identify()` sends the Supabase user id and nothing else. Never the email
 *    address, never a name.
 */

let started = false;

export function getPosthogKey(): string | undefined {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  return typeof key === 'string' && key.trim() !== '' ? key.trim() : undefined;
}

export function analyticsEnabled(): boolean {
  return getPosthogKey() !== undefined && started;
}

/** Idempotent. Safe to call from a StrictMode double-mount. */
export function initAnalytics(): void {
  if (started) return;
  const key = getPosthogKey();
  if (!key) return;
  if (typeof window === 'undefined') return;

  // PostHog Cloud is region-specific and sending to the wrong one silently
  // drops everything, so the host is configurable and defaults to US.
  const host = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: false, // sent manually — this is a SPA, see usePageViews
    disable_session_recording: true,
  });
  started = true;
}

/**
 * The events Madli actually cares about.
 *
 * A closed union rather than free-form strings: an analytics funnel is only
 * as good as its naming, and a typo'd event name is a silently missing step
 * that nobody notices for a month.
 */
export type AnalyticsEvent =
  | 'search_performed'
  | 'results_shown'
  | 'pick_opened'
  | 'directions_opened'
  | 'visit_logged'
  | 'bookmark_added'
  | 'plan_shared';

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!analyticsEnabled()) return;
  posthog.capture(event, properties);
}

export function trackPageView(path: string): void {
  if (!analyticsEnabled()) return;
  posthog.capture('$pageview', { $current_url: window.location.origin + path });
}

/** Ties events to a real signed-in user. Id only — no email, no name. */
export function identify(userId: string): void {
  if (!analyticsEnabled() || !userId) return;
  posthog.identify(userId);
}

/** Called on sign-out so the next person on this browser is not the last one. */
export function resetAnalytics(): void {
  if (!analyticsEnabled()) return;
  posthog.reset();
}
