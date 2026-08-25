import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { PickCard } from '../../components/trust/PickCard';
import { PickSkeleton } from '../../components/feedback/Skeleton';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Button } from '../../components/core/Button';
import { Tabs } from '../../components/navigation/Tabs';
import { Dialog } from '../../components/feedback/Dialog';
import { usePersona } from '../../dev/PersonaContext';
import { useGuestSession } from '../../lib/guestSession';
import { useDiscovery } from '../../data/useDiscovery';
import { useSearch } from '../../lib/searchState';
import { GoogleMapView, type MapMarker } from '../../components/map/GoogleMapView';
import { track } from '../../lib/analytics';
import { categoryName } from '../../fixtures/categories';
import { places as catalogue } from '../../fixtures/places';
import { placePhotoUrl } from '../../lib/placePhoto';

/**
 * S17 (Eat) and S18 (Explore) share this exact implementation by design — the
 * README is explicit both use "one component, one code path." Real
 * divergence is the mobile/desktop layout (three-in-a-row vs. stacked) and
 * Explore's extra map-view toggle; everything else is identical.
 */
export function ResultsScreen({ door }: { door: 'eat' | 'explore' }) {
  const navigate = useNavigate();
  const { breakpoint, persona } = usePersona();
  const guestSession = useGuestSession();
  const { search, setSearch, effectiveCenter } = useSearch();
  const [showLoading, setShowLoading] = useState(true);
  const [mapView, setMapView] = useState(false);
  const [showGate, setShowGate] = useState<'none' | 'paywall' | 'reject-intercept'>('none');
  const [round, setRound] = useState(0);
  // Google candidates the person has cycled past — kept separately from the
  // Madli place rejections in guestSession, because an unranked Google result
  // has no Madli place id to reject by.
  const [rejectedGoogleIds, setRejectedGoogleIds] = useState<Set<string>>(new Set());

  // Keep the door the person is actually looking at in the shared state, so
  // the map and any later filter edit act on this door, not the last one.
  useEffect(() => {
    if (search.door !== door) setSearch({ door });
  }, [door, search.door, setSearch]);

  const rejectedPlaceIds = useMemo(
    () => new Set(catalogue.filter((p) => guestSession.isRejected(p.id)).map((p) => p.id)),
    // `round` is the signal that the rejection set changed — guestSession is
    // a stable object, so it cannot be the dependency here.
    [guestSession, round], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const {
    data: discovery,
    isLoading,
    googleError,
    usedFallback,
  } = useDiscovery(door, rejectedPlaceIds, rejectedGoogleIds);

  useEffect(() => {
    if (persona === 'guest') {
      // recordSearch() is a real external-system side effect (increments the
      // shared guest session counter) whose outcome can only be known after
      // it runs — the resulting gate state isn't derivable during render, so
      // setting it here (rather than suppressing the effect entirely) is
      // intentional, not an "effect that should just be state" case.
      const { paywalled } = guestSession.recordSearch();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (paywalled) setShowGate('paywall');
    }
    // README: results resolve in ~900ms behind three PickSkeletons, no loading copy.
    const t = setTimeout(() => setShowLoading(false), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Three, never more" is enforced in buildDiscovery, next to the sort, so
  // no screen can quietly widen it.
  const ranked = discovery?.ranked ?? [];
  const unranked = discovery?.unranked ?? [];
  const threshold = discovery?.threshold ?? 0;

  // One event per resolved result set. Counts and filters only — no place
  // names, no coordinates, nothing that identifies where a person is.
  useEffect(() => {
    if (isLoading || !discovery) return;
    track('results_shown', {
      door,
      ranked_count: discovery.ranked.length,
      unranked_count: discovery.unranked.length,
      threshold: discovery.threshold,
      used_catalogue_fallback: usedFallback,
      has_vibe: search.vibe !== null,
      has_area: search.areaText.trim() !== '',
      constraint_mode: search.constraintMode,
      area_type: search.areaType,
      allows_pets: search.allowsPets,
      serves_pet_food: search.servesPetFood,
    });
    // discovery is the signal; the search fields are read at fire time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discovery, isLoading, door, usedFallback]);

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    ranked.forEach((r, i) => {
      if (!r.location) return;
      out.push({
        id: r.place.id,
        position: r.location,
        title: r.place.name,
        rank: (i + 1) as 1 | 2 | 3,
        onClick: () => navigate(`/places/${encodeURIComponent(r.place.slug)}`),
      });
    });
    for (const u of unranked) {
      out.push({ id: u.candidate.placeId, position: u.location, title: u.candidate.name });
    }
    return out;
  }, [ranked, unranked, navigate]);

  // Cycling rejects the ranked Madli places first (they are what the person
  // is actually being shown); the Google-only candidates behind them are
  // dismissed by place id so they do not come back either.
  const cycle = (keepFirst: boolean) => {
    const dropped = keepFirst ? ranked.slice(1) : ranked;
    guestSession.rejectPlaces(dropped.map((r) => r.place.id));
    if (dropped.length === 0 && unranked.length > 0) {
      const next = new Set(rejectedGoogleIds);
      for (const u of unranked.slice(0, 3)) next.add(u.candidate.placeId);
      setRejectedGoogleIds(next);
    }
    setRound((r) => r + 1);
  };

  const handleNoneOfThese = () => {
    if (persona === 'guest') {
      const free = guestSession.useFreeNoneOfThese();
      if (!free) {
        setShowGate('reject-intercept');
        return;
      }
    }
    cycle(false);
  };

  const handleShowTwoMore = () => cycle(true);

  return (
    <AppShell title={door === 'eat' ? 'Eat' : 'Explore'} onBack={() => navigate(-1)}>
      <div style={{ padding: 'var(--space-5) var(--gutter)' }}>
        {door === 'explore' ? (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <Tabs
              items={[
                { value: 'list', label: 'List' },
                { value: 'map', label: 'Map' },
              ]}
              value={mapView ? 'map' : 'list'}
              onChange={(v) => setMapView(v === 'map')}
            />
          </div>
        ) : null}

        <p
          style={{
            font: 'var(--type-evidence)',
            color: 'var(--evidence-text)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {ranked.length} ranked {ranked.length === 1 ? 'pick' : 'picks'}
          {unranked.length > 0 ? ` · ${unranked.length} more nearby, not ranked yet` : ''}
        </p>

        {usedFallback && googleError ? (
          <p
            style={{
              font: 'var(--type-caption)',
              color: 'var(--status-warn-fg)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Showing Madli&apos;s own ranked catalogue — live search is unavailable.{' '}
            {googleError.message}
          </p>
        ) : null}

        {showLoading || isLoading ? (
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-5)',
              gridTemplateColumns: breakpoint === 'desktop' ? 'repeat(3, 1fr)' : '1fr',
            }}
          >
            <PickSkeleton />
            <PickSkeleton />
            <PickSkeleton />
          </div>
        ) : mapView ? (
          <GoogleMapView
            markers={markers}
            center={effectiveCenter}
            height={breakpoint === 'desktop' ? 520 : 380}
            emptyLabel="Nothing to plot for this search yet"
          />
        ) : ranked.length === 0 && unranked.length === 0 ? (
          <EmptyState
            icon="map-pin-off"
            title="Nothing here yet"
            body={`We need about ${threshold} local ratings before we will call anything a pick, and this search turned up nothing nearby. Try a wider distance or a different area.`}
          />
        ) : (
          <>
            {ranked.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gap: 'var(--space-5)',
                  gridTemplateColumns: breakpoint === 'desktop' ? 'repeat(3, 1fr)' : '1fr',
                  marginBottom: 'var(--space-6)',
                }}
              >
                {ranked.map((r, i) => (
                  <PickCard
                    key={r.place.id}
                    rank={(i + 1) as 1 | 2 | 3}
                    name={r.place.name}
                    category={categoryName(r.place.categoryId)}
                    neighborhood={r.place.neighborhood}
                    priceLevel={r.place.priceLevel}
                    reason={r.place.reason}
                    gem={r.place.gem}
                    gapTone={r.place.gapTone ?? 'clear'}
                    gapPoints={r.place.gapPoints ?? undefined}
                    locals={r.place.locals}
                    visitors={r.place.visitors}
                    photoSrc={placePhotoUrl(r.place.slug)}
                    photoLabel={r.place.name}
                    onClick={() => {
                      track('pick_opened', { door, rank: i + 1, from: 'results_list' });
                      navigate(`/places/${encodeURIComponent(r.place.slug)}`);
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="map-pin-off"
                title="Nothing ranked here yet"
                body={`Madli ranks a place once it has about ${threshold} local ratings. These are nearby, but none has enough local data yet — so none of them gets a rank or a reason.`}
              />
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-7)' }}>
              <Button variant="secondary" onClick={handleNoneOfThese}>
                None of these
              </Button>
              <Button variant="secondary" onClick={handleShowTwoMore}>
                Show me two more
              </Button>
            </div>

            {unranked.length > 0 ? (
              <div>
                <h4
                  style={{
                    font: 'var(--type-eyebrow)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Nearby, not ranked yet
                </h4>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  {unranked.slice(0, 8).map((u) => (
                    <li
                      key={u.candidate.placeId}
                      style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
                    >
                      {u.candidate.name}
                      {' — '}
                      {u.reason === 'below_threshold' && u.place
                        ? `${u.place.locals.toLocaleString()} locals, under the ${threshold} we rank at`
                        : 'not in Madli yet'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>

      <Dialog
        open={showGate === 'paywall'}
        title="Like what you see?"
        onClose={() => setShowGate('none')}
        variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
      >
        <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-5)' }}>
          Sign up free to keep searching, save picks, and build your own ranked list.
        </p>
        <Button block onClick={() => navigate('/signup')}>
          Sign up
        </Button>
      </Dialog>

      <Dialog
        open={showGate === 'reject-intercept'}
        title="One more thing"
        onClose={() => setShowGate('none')}
        variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
      >
        <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-5)' }}>
          You've used your free "none of these" this session. Sign up to keep refining — it's free.
        </p>
        <Button block onClick={() => navigate('/signup')}>
          Sign up
        </Button>
      </Dialog>
    </AppShell>
  );
}
