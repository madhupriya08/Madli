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
 *
 * Ready means `google.maps.importLibrary` is a function — not merely that a
 * `<script>` tag fired `onload`. The classic `loading=async` URL resolves
 * `google.maps` before `importLibrary` exists; calling it then throws
 * "importLibrary is not a function" and discovery falls back to the
 * catalogue even though the key is valid. The dynamic bootstrap below is
 * Google's documented loader for that API.
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
const LIBRARIES = ['maps', 'places', 'marker', 'routes', 'geometry', 'geocoding'] as const;

type MapsNs = {
  importLibrary: (library: string, ...args: unknown[]) => Promise<unknown>;
  __ib__?: () => void;
};

type GoogleHost = { maps?: MapsNs };

function googleHost(): GoogleHost {
  const w = window as unknown as { google: GoogleHost };
  w.google = w.google ?? {};
  return w.google;
}

let loadPromise: Promise<typeof google.maps> | null = null;

function mapsReady(maps: MapsNs | undefined): maps is MapsNs {
  return typeof maps?.importLibrary === 'function';
}

async function preloadLibraries(maps: MapsNs): Promise<typeof google.maps> {
  await Promise.all(LIBRARIES.map((lib) => maps.importLibrary(lib)));
  return maps as unknown as typeof google.maps;
}

/**
 * Google's dynamic importLibrary bootstrap.
 *
 * Installs a stub `importLibrary` that injects the API script, then hands
 * off to the real implementation once the callback fires. Callers must not
 * treat `window.google.maps` as ready until `importLibrary` is a function.
 */
function bootstrapImportLibrary(key: string): Promise<MapsNs> {
  const host = googleHost();
  const maps: MapsNs = host.maps ?? ({} as MapsNs);
  host.maps = maps;

  if (typeof maps.importLibrary === 'function') return Promise.resolve(maps);

  let scriptPromise: Promise<void> | null = null;

  const loadScript = (): Promise<void> => {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      const params = new URLSearchParams({ key, v: 'weekly', callback: 'google.maps.__ib__' });
      maps.__ib__ = () => resolve();
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.onerror = (e) => {
        scriptPromise = null;
        reject(new MapsLoadError(e));
      };
      document.head.appendChild(script);
    });
    return scriptPromise;
  };

  const stub: MapsNs['importLibrary'] = (name: string) =>
    loadScript().then(() => {
      const loaded = googleHost().maps;
      if (!loaded || typeof loaded.importLibrary !== 'function' || loaded.importLibrary === stub) {
        throw new MapsLoadError('script loaded without importLibrary');
      }
      return loaded.importLibrary(name);
    });
  maps.importLibrary = stub;

  return loadScript().then(() => {
    const loaded = googleHost().maps;
    if (!loaded || typeof loaded.importLibrary !== 'function' || loaded.importLibrary === stub) {
      throw new MapsLoadError('script loaded without importLibrary');
    }
    return loaded;
  });
}

/**
 * Loads Maps JavaScript exactly once per page, whoever asks first.
 *
 * Concurrent callers share one promise. Ready is defined as
 * `typeof google.maps.importLibrary === 'function'`.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loadPromise) return loadPromise;

  const key = getMapsApiKey();
  if (!key) return Promise.reject(new MissingMapsKeyError());

  loadPromise = (async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new MapsLoadError('no DOM');
    }

    try {
      const existing = window.google?.maps as MapsNs | undefined;
      if (mapsReady(existing)) return preloadLibraries(existing);
      const maps = await bootstrapImportLibrary(key);
      return preloadLibraries(maps);
    } catch (err) {
      loadPromise = null;
      throw err instanceof MapsLoadError || err instanceof MissingMapsKeyError
        ? err
        : new MapsLoadError(err);
    }
  })();

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
