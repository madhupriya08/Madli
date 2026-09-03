import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { placeById } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import type { Tier } from '../../fixtures/mockDb';

const TIERS: { value: Tier; label: string }[] = [
  { value: 'loved', label: 'Loved it' },
  { value: 'fine', label: 'It was fine' },
  { value: 'disliked', label: "Didn't like it" },
];

// S25: two taps from here to a ranked place — the whole design constraint on
// S25-S27. The category shown is not decoration: it decides which pairwise
// bucket the place lands in, set on the catalogue record (S44), not chosen here.
//
// P12 §9: titled and worded exactly like the Rank-this-place card the
// post-visit nudge shows for a real (Google-sourced) place, so the two
// ranking entry points read as the same question rather than two designs.
//
// P13 §6: no fallback place any more. This used to default to
// `places.find(p => p.isActive)` — an arbitrary catalogue fixture, the same
// one for everyone — whenever it was reached with no `placeId` in state.
// The one caller that relied on that (MyRankedListScreen's global "Re-rank
// by comparing" button) always meant to name a specific place and never
// did; it is a real per-row action now, on the actual place, everywhere
// this screen is reached. A direct visit with no state is a dead link, not
// a demo — same rule PostVisitNudgeScreen's own comment already states.
export function LogVisitTriggerScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  const passedPlaceId = (location.state as { placeId?: string } | null)?.placeId;
  const place = passedPlaceId ? placeById(passedPlaceId) : undefined;
  const [tier, setTier] = useState<Tier | null>(null);

  if (!place) {
    return (
      <Dialog open title="Log a visit" onClose={() => navigate(-1)}>
        <EmptyState icon="map-pin-off" title="Nothing to log" />
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      title="Rank this place"
      subtitle={`How was ${place.name}?`}
      onClose={() => navigate(-1)}
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
    >
      <p
        style={{
          font: 'var(--type-caption)',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Ranked in {categoryName(place.categoryId)}. We&apos;ll compare it against the ones you
        already ranked there.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {TIERS.map((t) => (
          <Button
            key={t.value}
            variant={tier === t.value ? 'primary' : 'secondary'}
            block
            onClick={() => setTier(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-5)' }}>
        <Button
          block
          disabled={!tier}
          onClick={() => navigate('/log-visit/compare', { state: { placeId: place.id, tier } })}
        >
          Continue
        </Button>
      </div>
    </Dialog>
  );
}
