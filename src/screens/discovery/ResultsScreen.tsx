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
import { INITIAL_VISIBLE_PICKS, MAX_VISIBLE_PICKS, pickReason } from '../../data/hybridPicks';
import { useSearch } from '../../lib/searchState';
import { GoogleMapView, type MapMarker } from '../../components/map/GoogleMapView';
import { AppliedFilterChips } from './AppliedFilterChips';
import { useRankingCounts } from '../../data/googleRankings';
import { track } from '../../lib/analytics';
import type { Rank } from '../../components/trust/RankBadge';

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
  const [showGate, setShowGate] = useState<'none' | 'paywall' | 'signup-needed'>('none');
  const [rejectedGoogleIds, setRejectedGoogleIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_PICKS);

  useEffect(() => {
    if (search.door !== door) setSearch({ door });
  }, [door, search.door, setSearch]);

  const { data: discovery, isLoading, googleError } = useDiscovery(door, rejectedGoogleIds);

  useEffect(() => {
    if (persona === 'guest') {
      const { paywalled } = guestSession.recordSearch();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (paywalled) setShowGate('paywall');
    }
    const t = setTimeout(() => setShowLoading(false), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pool = discovery?.ranked ?? [];
  const ranked = pool.slice(0, Math.min(visibleCount, MAX_VISIBLE_PICKS));
  const canShowTwoMore = ranked.length < MAX_VISIBLE_PICKS && pool.length > ranked.length;

  // Madli's own local/visitor counts for whatever is on screen. Google supplies
  // the candidates; this is the only number here that came from Madli users.
  const { data: rankingCounts } = useRankingCounts(ranked.map((r) => r.candidate.placeId));

  const openPlace = (placeId: string, rank: number) => {
    track('pick_opened', { door, rank, from: 'results_list' });
    navigate(`/places/${encodeURIComponent(placeId)}`);
  };

  const typeLabel = (types: string[]) => {
    const t = types.find((x) => x !== 'point_of_interest' && x !== 'establishment');
    return t ? t.replace(/_/g, ' ') : undefined;
  };

  useEffect(() => {
    if (isLoading || !discovery) return;
    track('results_shown', {
      door,
      ranked_count: ranked.length,
      google_error: googleError != null,
      vibe_count: search.vibes.length,
      has_who: search.who !== null,
      has_occasion: search.occasion !== null,
      has_area: search.areaText.trim() !== '',
      constraint_mode: search.constraintMode,
      has_budget: search.budget !== null || search.budgetCap !== null,
      kitchen: search.kitchen,
      area_type: search.areaType,
      allows_pets: search.allowsPets,
      serves_pet_food: search.servesPetFood,
      open_now: search.openNow,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discovery, isLoading, door, googleError]);

  const markers: MapMarker[] = useMemo(
    () =>
      ranked.map((r, i) => ({
        id: r.candidate.placeId,
        position: r.location,
        title: r.candidate.name,
        rank: (i + 1) as Rank,
        onClick: () => openPlace(r.candidate.placeId, i + 1),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ranked],
  );

  // Both actions below used to look at guestSession.useFreeNoneOfThese() —
  // one free "None of these" per session, then an intercept. That quota is
  // gone: a Guest tapping either action now sees the signup prompt every
  // time. useFreeNoneOfThese/noneOfTheseUsedOnce stay in guestSession.tsx
  // (marked deprecated there) but nothing here calls them anymore — the
  // guestPaywallAtSearch-driven 'paywall' gate above is a separate trigger
  // and is untouched by this.
  const handleNoneOfThese = () => {
    if (persona === 'guest') {
      setShowGate('signup-needed');
      return;
    }
    const next = new Set(rejectedGoogleIds);
    for (const r of ranked) next.add(r.candidate.placeId);
    setRejectedGoogleIds(next);
    setVisibleCount(INITIAL_VISIBLE_PICKS);
  };

  const handleShowTwoMore = () => {
    if (persona === 'guest') {
      setShowGate('signup-needed');
      return;
    }
    setVisibleCount((n) => Math.min(MAX_VISIBLE_PICKS, n + 2));
  };

  return (
    <AppShell title={door === 'eat' ? 'Eat' : 'Explore'} onBack={() => navigate(-1)}>
      <div style={{ padding: 'var(--space-5) var(--gutter)' }}>
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

        <AppliedFilterChips />

        <p
          style={{
            font: 'var(--type-evidence)',
            color: 'var(--evidence-text)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {ranked.length} {ranked.length === 1 ? 'pick' : 'picks'}
          {search.areaText.trim() ? ` near ${search.areaText.trim()}` : ' nearby'}
        </p>

        {googleError ? (
          <p
            style={{
              font: 'var(--type-caption)',
              color: 'var(--status-warn-fg)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Live search is unavailable. {googleError.message}
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
        ) : ranked.length === 0 ? (
          <EmptyState
            icon="map-pin-off"
            title="Nothing here yet"
            body="Nothing nearby matched those filters. Try a wider distance or a different area."
          />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gap: 'var(--space-5)',
                gridTemplateColumns: breakpoint === 'desktop' ? 'repeat(3, 1fr)' : '1fr',
                marginBottom: 'var(--space-6)',
              }}
            >
              {ranked.map((r, i) => {
                const counts = rankingCounts?.[r.candidate.placeId];
                // Only shown once at least one person has actually ranked it.
                // "0 locals · 0 visitors" on every card of a new app is not
                // evidence, it is an apology.
                const hasCounts = (counts?.locals ?? 0) + (counts?.visitors ?? 0) > 0;
                return (
                  <PickCard
                    key={r.candidate.placeId}
                    rank={(i + 1) as Rank}
                    name={r.candidate.name}
                    category={typeLabel(r.candidate.types)}
                    neighborhood={r.candidate.address}
                    photoSrc={r.candidate.photoUrl}
                    photoLabel={r.candidate.name}
                    reason={pickReason(r.candidate, search.vibe)}
                    showStats={false}
                    locals={hasCounts ? counts?.locals : undefined}
                    visitors={hasCounts ? counts?.visitors : undefined}
                    // These counts are all-time, not a rolling window — saying
                    // "last 90 days" over an all-time total would be a lie.
                    dataWindow={hasCounts ? 'ranked on Madli' : ''}
                    onClick={() => openPlace(r.candidate.placeId, i + 1)}
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-7)' }}>
              <Button variant="secondary" onClick={handleNoneOfThese}>
                None of these
              </Button>
              {canShowTwoMore ? (
                <Button variant="secondary" onClick={handleShowTwoMore}>
                  Show me two more
                </Button>
              ) : null}
            </div>
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
        open={showGate === 'signup-needed'}
        title="This one needs an account"
        onClose={() => setShowGate('none')}
        variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
      >
        <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-5)' }}>
          Saving, two-stop plans and your ranked list are the parts we have to store. Everything
          you have done so far carries over.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/signup')}>Sign up</Button>
          <Button variant="ghost" onClick={() => setShowGate('none')}>
            Continue as guest
          </Button>
        </div>
      </Dialog>
    </AppShell>
  );
}
