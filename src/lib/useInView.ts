import { useEffect, useRef, useState } from 'react';

/**
 * P14: drives the .madli-reveal/.madli-reveal-in pair (interactions.css) —
 * a section starts hidden and animates in the first time it actually
 * scrolls into the viewport, rather than at mount (which every other motion
 * utility in this app does, and which is invisible for anything below the
 * fold: the animation has long finished by the time someone scrolls to it).
 *
 * Fires once and disconnects — a reveal that replayed every time someone
 * scrolled past would read as jittery, not premium.
 */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
