import posthog from 'posthog-js';
import { supabase } from './supabaseClient';
import type { Json } from './database.types';

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
  | 'plan_shared'
  /** Someone said whether they live in their area or are visiting it. */
  | 'residency_declared'
  /** A Google place was ranked (S29 onboarding, or a place page later). */
  | 'google_place_ranked';

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

/**
 * Phase 7: a separate, first-party event log for the admin Analytics
 * dashboard (S42) — everything above this point is PostHog, off by default
 * and never reaches this app's own database. logEvent() always writes (no
 * consent gate to check), because it carries none of the PII concerns
 * PostHog's defaults above guard against: no autocapture, no free-form
 * field contents, just a named event and the couple of numbers/ids each
 * dashboard tile needs (see supabase/migrations/..._admin_analytics_metrics.sql).
 */
export type FunnelEvent =
  | 'session_started'
  | 'signup_completed'
  | 'results_shown'
  | 'pick_opened'
  | 'show_two_more_clicked'
  | 'comparison_started'
  | 'comparison_completed';

const SESSION_ID_KEY = 'madli.analyticsSessionId';

/** One random id per tab, persisted for the tab's lifetime — how a Guest's own funnel is correlated with no account to key it on. */
export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
  } catch {
    // sessionStorage unavailable (private mode, etc.) — a fresh id per call
    // just means this one event can't be paired with another; never worth
    // failing the action it's attached to over.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function logEvent(
  event: FunnelEvent,
  userId: string | null,
  metadata?: Record<string, unknown>,
): void {
  supabase
    .from('analytics_events')
    .insert({
      event_type: event,
      user_id: userId,
      session_id: getSessionId(),
      metadata: (metadata ?? {}) as unknown as Json,
    })
    .then(undefined, () => {
      // Best-effort, same as PostHog's track() above — a dropped analytics
      // write is never a reason to disrupt what the person was doing.
    });
}
