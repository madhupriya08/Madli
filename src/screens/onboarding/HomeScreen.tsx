import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Card } from '../../components/core/Card';
import { Icon } from '../../components/core/Icon';
import { usePersona } from '../../dev/PersonaContext';
import { useSearch, type Door } from '../../lib/searchState';
import { areas } from '../../fixtures/areas';
import { useAreaDoorCounts } from '../../data/areaCounts';
import { usePostVisitNudgeCandidate } from '../../data/postVisitNudge';

/** Once per browser session, not once per Home mount — reaching Home via
 * back/forward or between doors must not re-trigger the same nudge. */
const NUDGE_SHOWN_KEY = 'madli.postVisitNudge.shown';

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

export function HomeScreen() {
  const navigate = useNavigate();
  const { persona, userId, displayName } = usePersona();
  const { search, setSearch } = useSearch();
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

  // S30's real trigger: there is no push-notification system, so "some time
  // after a visit" is not reachable — this fires instead the next time a
  // signed-in person with a bookmarked-but-unranked place lands on Home,
  // once per browser session so re-visiting Home doesn't repeat it.
  const nudgeCandidate = usePostVisitNudgeCandidate(userId, personalized);
  useEffect(() => {
    if (!nudgeCandidate) return;
    if (sessionStorage.getItem(NUDGE_SHOWN_KEY)) return;
    sessionStorage.setItem(NUDGE_SHOWN_KEY, '1');
    navigate('/post-visit-nudge', { state: { subject: nudgeCandidate }, replace: true });
  }, [nudgeCandidate, navigate]);

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
      </div>
    </AppShell>
  );
}
