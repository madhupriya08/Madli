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
import { usePublishedPicks } from '../../data/hooks';
import { categoryName } from '../../fixtures/categories';
import type { Place } from '../../fixtures/places';
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
  const { data: allPicks, isLoading } = usePublishedPicks({ type: door });
  const [showLoading, setShowLoading] = useState(true);
  const [mapView, setMapView] = useState(false);
  const [showGate, setShowGate] = useState<'none' | 'paywall' | 'reject-intercept'>('none');
  const [round, setRound] = useState(0);

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

  const eligible = useMemo(
    () => (allPicks ?? []).filter((p) => !guestSession.isRejected(p.id)),
    [allPicks, guestSession, round], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Rule 1: three picks, never more — enforced here at the query-layer call site.
  const picks = eligible.slice(0, 3);
  const honestSample = eligible.slice(3, 6);

  const handleNoneOfThese = () => {
    if (persona === 'guest') {
      const free = guestSession.useFreeNoneOfThese();
      if (!free) {
        setShowGate('reject-intercept');
        return;
      }
    }
    guestSession.rejectPlaces(picks.map((p) => p.id));
    setRound((r) => r + 1);
  };

  const handleShowTwoMore = () => {
    guestSession.rejectPlaces(picks.slice(1).map((p) => p.id));
    setRound((r) => r + 1);
  };

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
          {eligible.length} places ranked in this area
        </p>

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
          <div
            style={{
              height: 320,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Map placeholder — markers by type, dashed route
            </span>
          </div>
        ) : picks.length === 0 ? (
          <EmptyState
            icon="map-pin-off"
            title="No ranking here yet"
            body="We need about 50 local ratings before we will call anything a pick. Browse the launch neighbourhoods instead."
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
              {picks.map((p: Place, i) => (
                <PickCard
                  key={p.id}
                  rank={(i + 1) as 1 | 2 | 3}
                  name={p.name}
                  category={categoryName(p.categoryId)}
                  neighborhood={p.neighborhood}
                  priceLevel={p.priceLevel}
                  reason={p.reason}
                  gem={p.gem}
                  gapTone={p.gapTone ?? 'clear'}
                  gapPoints={p.gapPoints ?? undefined}
                  locals={p.locals}
                  visitors={p.visitors}
                  photoSrc={placePhotoUrl(p.slug)}
                  photoLabel={p.name}
                  onClick={() => navigate(`/places/${encodeURIComponent(p.slug)}`)}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-7)' }}>
              <Button variant="secondary" onClick={handleNoneOfThese}>
                None of these
              </Button>
              <Button variant="secondary" onClick={handleShowTwoMore}>
                Show me two more
              </Button>
            </div>

            {honestSample.length > 0 ? (
              <div>
                <h4
                  style={{
                    font: 'var(--type-eyebrow)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Just outside the cut
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
                  {honestSample.map((p) => (
                    <li
                      key={p.id}
                      style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
                    >
                      {p.name} — {p.locals.toLocaleString()} locals
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
