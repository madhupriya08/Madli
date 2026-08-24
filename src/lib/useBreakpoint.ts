import { useCallback, useSyncExternalStore } from 'react';

/**
 * The design handoff defines exactly two breakpoints (README §Responsive):
 * mobile (390px frame) and desktop (1280 canvas, content capped at 1160).
 * It does not name the switch-over width, so this picks 1024px — the
 * conventional laptop/tablet-landscape threshold, and comfortably above the
 * 1160 content cap's own natural minimum, so nothing between the two
 * breakpoints renders half-designed.
 *
 * The same query string is duplicated once in CSS
 * (public/design-system/tokens/spacing.css) so token-level reflow and the
 * markup-level divergence screens change over at the same width.
 */
export const DESKTOP_QUERY = '(min-width: 1024px)';

function supportsMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * True when the real viewport is desktop-width.
 *
 * useSyncExternalStore rather than useState + useEffect: matchMedia is
 * exactly the "external store" it exists for, and it reads the current match
 * during render, so there is no first-paint flash of the mobile layout on a
 * desktop window and no setState-in-effect cascade.
 */
export function useIsDesktop(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!supportsMatchMedia()) return () => {};
    const mql = window.matchMedia(DESKTOP_QUERY);
    mql.addEventListener('change', onStoreChange);
    return () => mql.removeEventListener('change', onStoreChange);
  }, []);

  const getSnapshot = useCallback(
    () => (supportsMatchMedia() ? window.matchMedia(DESKTOP_QUERY).matches : false),
    [],
  );

  // jsdom (Vitest) has no matchMedia by default, and there is no SSR here;
  // both fall back to the mobile layout, which is the design's primary.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
