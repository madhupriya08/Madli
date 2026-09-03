import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layout/AppShell';
import { Card } from '../../components/core/Card';
import { Icon } from '../../components/core/Icon';
import { Tag } from '../../components/core/Tag';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { haversineMeters, useSearch, type Door } from '../../lib/searchState';
import { areas } from '../../fixtures/areas';
import { useAreaDoorCounts } from '../../data/areaCounts';
import { usePostVisitNudgeCandidate } from '../../data/postVisitNudge';
import { useMyGoogleRankings } from '../../data/googleRankings';
import { fetchHomeArea, setHomeAreaId, setHomeAreaText } from '../../data/homeArea';
import { listRecentSearches } from '../../lib/recentSearches';

/** Once per browser session, not once per Home mount — reaching Home via
 * back/forward or between doors must not re-trigger the same nudge. */
const NUDGE_SHOWN_KEY = 'madli.postVisitNudge.shown';

/**
 * P12 §9: "in the app page after login show the user his place in that
 * locality based on his rankings."
 *
 * "In this locality" is answered two ways, because either one alone gets it
 * wrong: by the area name the place was ranked under (exact, but only ever
 * set when the person had an area chosen at the time), and by real distance
 * from wherever the search is currently centred (works regardless, and is
 * what "round here" actually means). A place qualifies on either.
 */
const NEARBY_RANKING_METERS = 8_000;
const MAX_HOME_RANKINGS = 3;

// S7: two doors, CSS grid with a 280px minimum so desktop side-by-side and
// mobile stack are the same markup — real divergence starts at S17.
const DOORS = [
  {
    value: 'eat' as const,
    label: 'Eat',
    body: 'Breakfast, biryani, cafes: three picks in two minutes.',
    icon: 'utensils',
  },
  {
    value: 'explore' as const,
    label: 'Explore',
    body: 'Lakes, history, nightlife: where to go today.',
    icon: 'map',
  },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { persona, userId, displayName } = usePersona();
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

  // P14: "Set as home" moved here from every row of the area picker (it
  // used to sit on all eight-plus rows there, most of which someone would
  // never touch again) to the one place it actually means something — the
  // area they are looking at right now.
  const [homeOverride, setHomeOverride] = useState<
    { areaId: string | null; areaText: string | null } | undefined
  >(undefined);
  const homeAreaQuery = useQuery({
    queryKey: ['home-area', userId],
    queryFn: () => fetchHomeArea(userId),
    enabled: personalized && !!userId,
    retry: false,
  });
  const currentHome = homeOverride ?? homeAreaQuery.data ?? { areaId: null, areaText: null };
  const isCurrentAreaHome = matchedArea
    ? currentHome.areaId === matchedArea.id
    : search.areaText.trim() !== '' && currentHome.areaText === search.areaText.trim();
  const toggleCurrentAreaHome = async () => {
    try {
      if (matchedArea) {
        await setHomeAreaId(userId, isCurrentAreaHome ? null : matchedArea.id);
        setHomeOverride({ areaId: isCurrentAreaHome ? null : matchedArea.id, areaText: null });
      } else {
        const text = isCurrentAreaHome ? null : search.areaText.trim();
        await setHomeAreaText(userId, text);
        setHomeOverride({ areaId: null, areaText: text });
      }
      show(isCurrentAreaHome ? 'Removed as your home area.' : `${search.areaText} is now your home area.`);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save your home area.');
    }
  };

  // P14 §3: the last five searches, right on Home too, not just the Search
  // tab, so picking up where you left off does not need a second tap into
  // Search first.
  const recentSearches = listRecentSearches(userId);
  const openRecentSearch = (snapshot: (typeof recentSearches)[number]['snapshot']) => {
    setSearch(snapshot);
    navigate(snapshot.door === 'explore' ? '/results/explore' : '/results/eat');
  };

  // The person's own ranked places near here — their list, not the app's.
  // Disliked entries are excluded exactly as they are on S31: still counted,
  // never displayed.
  const { data: myRankings = [] } = useMyGoogleRankings(undefined, personalized);
  const areaKey = search.areaText.trim().toLowerCase();
  const rankingsHere = myRankings
    .filter((entry) => entry.tier !== 'disliked')
    .filter((entry) => {
      const sameArea = areaKey !== '' && (entry.areaText ?? '').trim().toLowerCase() === areaKey;
      const nearby =
        entry.location != null &&
        haversineMeters(effectiveCenter, entry.location) <= NEARBY_RANKING_METERS;
      return sameArea || nearby;
    })
    .sort((a, b) => a.position - b.position)
    .slice(0, MAX_HOME_RANKINGS);

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
    // P12 §5: and drop any typed search still carried from the Search tab —
    // starting a door from Home is a fresh intent, not a continuation of
    // "biryani" from twenty minutes ago.
    setSearch({ door, vibes: [], queryText: '' });
    // Straight to intake. Home is always located — S8 (`/area`) runs once,
    // required, between the auth choice and here — so there is no per-tap
    // "was location asked?" check left to make.
    navigate('/intake');
  };

  return (
    <AppShell title="Madli">
      <div style={{ padding: 'var(--space-6) var(--gutter)' }}>
        {search.areaText ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => navigate('/area', { state: { next: '/app' } })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
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
            {personalized ? (
              <Tag
                icon="home"
                selected={isCurrentAreaHome}
                tone="outline"
                onClick={() => void toggleCurrentAreaHome()}
              >
                {isCurrentAreaHome ? 'Home area' : 'Set as home'}
              </Tag>
            ) : null}
          </div>
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
          Two doors, pick the one you need right now.
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

        {personalized && rankingsHere.length > 0 ? (
          <section
            style={{
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--white)',
              padding: 'var(--space-5)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <h2
              style={{
                margin: 0,
                font: 'var(--type-eyebrow)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-eyebrow)',
                color: 'var(--text-muted)',
              }}
            >
              Your list {search.areaText.trim() ? `in ${search.areaText.trim()}` : 'around here'}
            </h2>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rankingsHere.map((entry, i) => (
                <li
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom:
                      i === rankingsHere.length - 1 ? 'none' : '1px solid var(--border-hairline)',
                  }}
                >
                  {/* Their own position in this door's list, which is what
                      the number means everywhere else in the app too — not a
                      renumbering of the three shown here. */}
                  <span
                    style={{ font: 'var(--type-label)', color: 'var(--text-muted)', width: 28 }}
                  >
                    #{entry.position}
                  </span>
                  <button
                    onClick={() => navigate(`/places/${encodeURIComponent(entry.googlePlaceId)}`)}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      font: 'var(--type-body-sm)',
                      color: 'var(--text-heading)',
                    }}
                  >
                    {entry.placeName}
                  </button>
                  <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
                    {entry.tier === 'loved' ? 'Loved it' : 'It was fine'}
                  </span>
                </li>
              ))}
            </ol>
            <button
              onClick={() => navigate('/my-list')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-link)',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                font: 'var(--type-label)',
              }}
            >
              See your whole ranked list
            </button>
          </section>
        ) : null}

        <div
          className="madli-stagger"
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
                  {doorCounts[door.value].placeCount} places · {doorCounts[door.value].rankedCount}{' '}
                  rankings logged
                </p>
              ) : null}
            </Card>
          ))}
        </div>

        {recentSearches.length > 0 ? (
          <div style={{ marginTop: 'var(--space-7)' }}>
            <h2
              style={{
                font: 'var(--type-eyebrow)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-eyebrow)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Recent searches
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {recentSearches.map((r) => (
                <Tag key={r.id} onClick={() => openRecentSearch(r.snapshot)}>
                  {r.label}
                </Tag>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
