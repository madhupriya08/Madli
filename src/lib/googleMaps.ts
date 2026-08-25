/// <reference types="google.maps" />

/**
 * The one place Maps JavaScript is loaded.
 *
 * Only the browser key (`VITE_GOOGLE_MAPS_API_KEY`) reaches the client, and
 * only for Maps JavaScript — it is public by nature, so the real control is
 * an HTTP-referrer restriction in Google Cloud Console, not secrecy. Anything
 * that needs a server-side key belongs in an Edge Function; there is no
 * second copy of a key in this bundle.
 *
 * Every failure here is a typed, catchable error rather than a throw into a
 * render, so screens can show a real empty state instead of a blank page:
 * a missing key is a setup problem, a load failure is a network/blocked-API
 * problem, and the two read differently to whoever has to fix them.
 */

export class MissingMapsKeyError extends Error {
  constructor() {
    super(
      'Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to .env.local and restart the dev server.',
    );
    this.name = 'MissingMapsKeyError';
  }
}

export class MapsLoadError extends Error {
  constructor(cause?: unknown) {
    super(
      'Google Maps could not be loaded. Check the API key, its referrer restrictions, and that the Maps JavaScript API is enabled.',
    );
    this.name = 'MapsLoadError';
    this.cause = cause;
  }
}

/**
 * Google refuses a request whose API is not enabled on the project rather
 * than one whose key is wrong, and the two need very different fixes — so
 * this is its own error with the console link in the message.
 */
export class MapsApiNotEnabledError extends Error {
  constructor(public api: string) {
    super(
      `The ${api} is not enabled for this Google Cloud project. Enable it at ` +
        `https://console.cloud.google.com/apis/library and try again.`,
    );
    this.name = 'MapsApiNotEnabledError';
  }
}

export function getMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === 'string' && key.trim() !== '' ? key.trim() : undefined;
}

export function hasMapsApiKey(): boolean {
  return getMapsApiKey() !== undefined;
}

/** Libraries this app uses. Requested up front so no screen triggers a second load. */
const LIBRARIES = ['places', 'marker', 'routes', 'geometry'] as const;

let loadPromise: Promise<typeof google.maps> | null = null;

/**
 * Loads Maps JavaScript exactly once per page, whoever asks first.
 *
 * Concurrent callers share one promise and one `<script>` tag: several
 * screens mount maps at the same time, and a second injection is both a
 * double bill and a console warning from Google.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loadPromise) return loadPromise;

  const key = getMapsApiKey();
  if (!key) return Promise.reject(new MissingMapsKeyError());

  loadPromise = new Promise<typeof google.maps>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new MapsLoadError('no DOM'));
      return;
    }
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key,
      v: 'weekly',
      libraries: LIBRARIES.join(','),
      loading: 'async',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new MapsLoadError('script loaded without google.maps'));
    };
    script.onerror = (e) => {
      // Let a later attempt retry rather than caching the failure forever —
      // the usual cause is a transient network problem or a referrer
      // restriction the developer is in the middle of fixing.
      loadPromise = null;
      reject(new MapsLoadError(e));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Turns Google's "this API is blocked/not activated" rejections into a
 * MapsApiNotEnabledError. Google reports these through several different
 * shapes depending on the service, hence the string sniffing.
 */
export function asMapsError(err: unknown, api: string): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (
    /not activated|API_KEY_SERVICE_BLOCKED|are blocked|PERMISSION_DENIED|ApiNotActivatedMapError|ApiTargetBlockedMapError/i.test(
      message,
    )
  ) {
    return new MapsApiNotEnabledError(api);
  }
  return err instanceof Error ? err : new Error(message);
}
