import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './analytics';

/**
 * Page views for a single-page app.
 *
 * PostHog's automatic `capture_pageview` fires once on the first load and
 * never again, because a client-side route change is not a page load — every
 * screen after the first would be invisible. This sends one on each real
 * route change instead.
 */

/**
 * Strips secrets out of a path before it leaves the browser.
 *
 * `/plans/:id` is the one that matters: on a shared link that segment is a
 * real, permanent, cap-free share token (see src/data/plans.ts). Sending it
 * as a page-view URL would put a working link to somebody's plan into a
 * third-party dashboard, where it would sit in exports and logs for as long
 * as the account exists. Query strings go too — `?shared=1` is harmless but
 * the next param added might not be.
 *
 * Place slugs are left intact: they are public, non-secret, and knowing which
 * places people open is the entire point of having analytics.
 */
export function redactPath(pathname: string): string {
  return pathname.replace(/^\/plans\/[^/]+/, '/plans/:token');
}

export function usePageViews(): void {
  const location = useLocation();

  useEffect(() => {
    trackPageView(redactPath(location.pathname));
  }, [location.pathname]);
}
