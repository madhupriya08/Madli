import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Card } from '../../components/core/Card';
import { Icon } from '../../components/core/Icon';
import { PhotoFrame } from '../../components/core/PhotoFrame';
import { usePersona } from '../../dev/PersonaContext';
import { haversineMeters, useSearch, type Door } from '../../lib/searchState';
import { areas } from '../../fixtures/areas';
import { places } from '../../fixtures/places';
import { placePhotoUrl } from '../../lib/placePhoto';
import { useAreaDoorCounts } from '../../data/areaCounts';

// S7: two doors, CSS grid with a 280px minimum so desktop side-by-side and
// mobile stack are the same markup — real divergence starts at S17.
const DOORS = [
  {
    value: 'eat' as const,
    label: 'Eat',
    body: 'Breakfast, biryani, cafes — three picks in two minutes.',
    icon: 'utensils',
  },
  {
    value: 'explore' as const,
    label: 'Explore',
    body: 'Lakes, history, nightlife — where to go today.',
    icon: 'map',
  },
];

/**
 * "Gem of the town" — the prototype's own S7 carries this banner (not just
 * S1's marketing page, where an earlier build had put it exclusively).
 * Moved here, scoped to wherever the person actually is rather than shown
 * to every anonymous visitor before they have picked anywhere: nearest
 * gem-flagged place to the real selected origin, only surfaced within a
 * radius that means something (there is currently exactly one seeded gem —
 * Subhan Bakery, Nampally — so this returns null everywhere outside
 * Hyderabad, honestly, rather than reaching for a distant one).
 */
const GEM_RADIUS_METERS = 40_000;

function nearestGem(center: { lat: number; lng: number }) {
  let best: (typeof places)[number] | null = null;
  let bestDist = Infinity;
  for (const p of places) {
    if (!p.gem || p.lat == null || p.lng == null) continue;
    const dist = haversineMeters(center, { lat: p.lat, lng: p.lng });
    if (dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best && bestDist <= GEM_RADIUS_METERS ? best : null;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { persona, displayName } = usePersona();
  const { search, setSearch, effectiveCenter } = useSearch();
  const personalized = persona === 'user';
  // First name only: "Welcome back, Madhu" is a greeting, "Welcome back,
  // Madhu Priya Reddy" is a form letter.
  const firstName = displayName?.trim().split(/\s+/)[0];
  // S8 is now a required stop before Home ever renders, so there is always
  // an area here — this looks it up only to print the real coverage-depth
  // line below, never to decide whether to redirect anywhere.
  const matchedArea = areas.find((a) => a.name === search.areaText);
  // Real counts, not the door's flavour copy — how many places and how many
  // logged rankings actually exist behind each door for this area.
  const { data: doorCounts } = useAreaDoorCounts(matchedArea?.id ?? null);
  const gem = nearestGem(effectiveCenter);

  const openDoor = (door: Door) => {
    // Clear the other door's vibes so Eat chips don't bias an Explore search.
    setSearch({ door, vibes: [] });
    // Straight to intake. Home is always located — S8 (`/area`) runs once,
    // required, between the auth choice and here — so there is no per-tap
    // "was location asked?" check left to make.
    navigate('/intake');
  };

  return (
    <AppShell title="Madli">
      <div style={{ padding: 'var(--space-6) var(--gutter)' }}>
        {search.areaText ? (
          <button
            onClick={() => navigate('/area', { state: { next: '/app' } })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 'var(--space-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Icon name="map-pin" size={14} color="var(--teal-600)" />
            <span
              style={{
                font: 'var(--type-eyebrow)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-eyebrow)',
                color: 'var(--teal-600)',
              }}
            >
              {search.areaText} · Change
            </span>
          </button>
        ) : null}

        <h1 style={{ font: 'var(--type-h2)', marginBottom: 'var(--space-2)' }}>
          {personalized
            ? firstName
              ? `Welcome back, ${firstName}`
              : 'Welcome back'
            : 'Where to start?'}
        </h1>
        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Two doors — pick the one you need right now.
        </p>

        {personalized && matchedArea ? (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-6)',
              flexWrap: 'wrap',
            }}
          >
            {/* Real, not invented: the actual coverage depth for the area
                just chosen above, not a fabricated recent-search line —
                there is no recent-searches store to draw from yet. The area
                name itself already sits in the eyebrow, so this only adds
                what that line doesn't: how deep the ranking actually goes. */}
            <span style={{ font: 'var(--type-caption)', color: 'var(--text-faint)' }}>
              {matchedArea.coverageDepthLabel}
            </span>
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gap: 'var(--space-5)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {DOORS.map((door) => (
            <Card
              key={door.value}
              interactive
              onClick={() => openDoor(door.value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-9)',
                textAlign: 'center',
              }}
            >
              <Icon name={door.icon} size={32} color="var(--teal-500)" />
              <h2 style={{ font: 'var(--type-h3)' }}>{door.label}</h2>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{door.body}</p>
              {doorCounts ? (
                <p style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
                  {doorCounts[door.value].placeCount} places ·{' '}
                  {doorCounts[door.value].rankedCount} rankings logged
                </p>
              ) : null}
            </Card>
          ))}
        </div>

        {gem ? (
          <button
            onClick={() => navigate(`/places/${encodeURIComponent(gem.slug)}`)}
            style={{
              width: '100%',
              marginTop: 'var(--space-6)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-5)',
              alignItems: 'center',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--surface-inverse)',
              color: 'var(--white)',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span
                style={{
                  font: 'var(--type-eyebrow)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-eyebrow)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                Gem of the town · this week
              </span>
              <span style={{ font: 'var(--type-h4)', color: '#fff' }}>{gem.name}</span>
              <span
                style={{
                  font: 'var(--type-body)',
                  color: 'var(--text-on-dark-muted)',
                  maxWidth: 'var(--reason-max)',
                }}
              >
                {gem.reason}
              </span>
            </span>
            <span style={{ width: 132, justifySelf: 'end' }}>
              <PhotoFrame
                src={placePhotoUrl(gem.slug, 260, 260)}
                alt={gem.name}
                label={gem.name}
                ratio="1 / 1"
              />
            </span>
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
