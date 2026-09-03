import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { Card } from '../../components/core/Card';
import { Tag } from '../../components/core/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PickSkeleton } from '../../components/feedback/Skeleton';
import { useToast } from '../../components/feedback/ToastProvider';
import { searchCandidates, type GoogleCandidate } from '../../lib/placesSearch';
import { hasMapsApiKey } from '../../lib/googleMaps';
import { useSearch, type Door } from '../../lib/searchState';
import { usePersona } from '../../dev/PersonaContext';
import {
  setResidentStatus,
  useRankGooglePlace,
  useUnrankGooglePlace,
  useResidentStatus,
  type RankTier,
  type ResidentStatus,
} from '../../data/googleRankings';
import { getPersonalizedSuggestions } from '../../data/recommendations';
import { PhotoFrame } from '../../components/core/PhotoFrame';
import { track } from '../../lib/analytics';

const TIERS: Array<{ tier: RankTier; label: string }> = [
  { tier: 'loved', label: 'Loved it' },
  { tier: 'fine', label: 'It was fine' },
  { tier: 'disliked', label: 'Not for me' },
];

const DOOR_SECTIONS: Array<{ door: Door; heading: string }> = [
  { door: 'eat', heading: 'Places to eat' },
  { door: 'explore', heading: 'Places to explore' },
];

/**
 * S29, rebuilt: the optional ranking ask, now running straight after the
 * location step rather than off a hardcoded fixture place.
 *
 * Three things changed and each was a real hole:
 *
 *  1. It offered one place from `fixtures/places` — a seeded catalogue row
 *     that has nothing to do with wherever the person actually is. It now
 *     asks Google for places around the origin they just chose.
 *  2. Nothing it collected was ever stored anywhere. It now writes real rows
 *     via fn_rank_google_place.
 *  3. Local vs visitor did not exist. It is asked here, once, in the person's
 *     own words — the split is what makes "3 locals · 1 visitor" mean
 *     something, and it cannot be guessed from coordinates.
 *
 * Nothing on this screen is required. Skip is a first-class exit, stated
 * plainly, and it is reachable before answering anything at all — Phase 6
 * §5 moved it from the very bottom (below the whole nearby-places list, on
 * both breakpoints, since this screen has one reflowing layout rather than
 * separate mobile/desktop ones) to right under the intro copy, so it no
 * longer takes a full scroll past everything else to find it.
 */
export function RankingOnboardingScreen() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { userId, hasSession, breakpoint } = usePersona();
  const { search, effectiveCenter } = useSearch();
  // The question this screen used to ask directly now runs earlier, right
  // after S8 (LocalOrVisitorScreen) — this reads whatever that answer was
  // rather than asking a second time. `residencyOverride` only exists so a
  // fresh answer made right here (for the person who skipped it earlier)
  // shows immediately, without waiting on a refetch.
  const existingResidency = useResidentStatus(userId, true);
  const [residencyOverride, setResidencyOverride] = useState<ResidentStatus | null | undefined>(
    undefined,
  );
  const residency =
    residencyOverride !== undefined ? residencyOverride : (existingResidency.data ?? null);
  const [ranked, setRanked] = useState<Record<string, RankTier>>({});
  const rank = useRankGooglePlace();
  const unrank = useUnrankGooglePlace();

  // Both doors feed the ranked list this screen is meant to seed — Eat only
  // was a real, specific gap: the recommendation logic downstream reads
  // whichever door someone is browsing, and it had nothing to go on for
  // Explore because this screen never asked about Explore places at all.
  function useNearbyCandidates(door: Door) {
    return useQuery({
      queryKey: [
        'ranking-onboarding-nearby',
        door,
        effectiveCenter.lat,
        effectiveCenter.lng,
        hasSession ? userId : null,
      ],
      queryFn: async (): Promise<GoogleCandidate[]> => {
        if (!hasMapsApiKey()) return [];
        // A wide radius and no vibe words on purpose: this is "places you
        // might already know", not a search. Narrowing it to their filters
        // would offer back the same places discovery is about to show them.
        const candidates = await searchCandidates({
          door,
          center: effectiveCenter,
          radiusMeters: 8000,
          areaText: search.areaText,
          maxResults: 12,
          clipToRadius: false,
        });
        // Well-known first — you can only rank somewhere you have been, and
        // the busiest places are the ones most people have.
        const top = [...candidates]
          .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
          .slice(0, 8);
        // P5 §3: if this person has already ranked a few places (a return
        // visit to this screen, or Eat feeding into Explore's ordering),
        // offer ones closer to what they have already shown they like first.
        if (!hasSession || !userId) return top;
        return getPersonalizedSuggestions(userId, door, top);
      },
      retry: false,
      staleTime: 10 * 60 * 1000,
    });
  }

  const nearbyEat = useNearbyCandidates('eat');
  const nearbyExplore = useNearbyCandidates('explore');
  const nearbyByDoor: Record<Door, ReturnType<typeof useNearbyCandidates>> = {
    eat: nearbyEat,
    explore: nearbyExplore,
  };

  const chooseResidency = async (status: ResidentStatus) => {
    try {
      await setResidentStatus(status, search.areaText.trim() || null);
      // Only reflect the choice once it is actually stored. Setting it first
      // and swallowing the failure left the chip looking chosen while the
      // profile column stayed null, and every rating after that came back
      // with fn_rank_google_place's 23514 — which reads, verbatim, "set
      // profiles.resident_status before ranking". Confusing on its own, and
      // impossible to act on when the UI insists you already answered.
      setResidencyOverride(status);
      track('residency_declared', { status });
    } catch (err) {
      setResidencyOverride(null);
      show(err instanceof Error ? err.message : 'Could not save that. Try again in a moment.');
    }
  };

  const rate = async (candidate: GoogleCandidate, door: Door, tier: RankTier) => {
    if (!residency) {
      show('First, tell us if you live here or are visiting.');
      return;
    }
    try {
      await rank.mutateAsync({
        googlePlaceId: candidate.placeId,
        placeName: candidate.name,
        door,
        tier,
        location: candidate.location,
        areaText: search.areaText.trim() || null,
        types: candidate.types,
      });
      setRanked((prev) => ({ ...prev, [candidate.placeId]: tier }));
      track('google_place_ranked', { tier, rater_type: residency });
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save that ranking.');
    }
  };

  // Tapping the tier that is already selected undoes it, rather than
  // silently re-submitting the same answer with no way back — the concrete
  // bug this screen had: a mis-tap permanently polluted the ranked list.
  const toggleRate = async (candidate: GoogleCandidate, door: Door, tier: RankTier) => {
    if (ranked[candidate.placeId] === tier) {
      try {
        await unrank.mutateAsync(candidate.placeId);
        setRanked((prev) => {
          const next = { ...prev };
          delete next[candidate.placeId];
          return next;
        });
      } catch (err) {
        show(err instanceof Error ? err.message : 'Could not undo that ranking.');
      }
      return;
    }
    await rate(candidate, door, tier);
  };

  const done = () => navigate('/app');
  const rankedCount = Object.keys(ranked).length;

  return (
    <AppShell title="Rank places you know" showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <div>
          <p style={{ font: 'var(--type-body-lg)', color: 'var(--text-body)' }}>
            Been anywhere around here already? Tell us what you thought. It is what makes the
            rankings local instead of generic.
          </p>
          <p
            style={{
              font: 'var(--type-body-sm)',
              color: 'var(--text-muted)',
              marginTop: 'var(--space-2)',
            }}
          >
            Entirely optional, and there is no minimum. Skip it and everything still works.
          </p>
          <button
            onClick={done}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
              font: 'var(--type-body-sm)',
              padding: 0,
              marginTop: 'var(--space-3)',
            }}
          >
            Skip for now — you can rank any place from its own page later
          </button>
        </div>

        {residency ? (
          // Already answered — at S8's LocalOrVisitorScreen, most likely.
          // Asking again here would be the same question twice in one flow.
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            You told us you{residency === 'local' ? ' live here' : "'re visiting"} — that is what
            these ratings will count as.
          </p>
        ) : (
          <div>
            <h3 style={{ font: 'var(--type-label)', marginBottom: 'var(--space-2)' }}>
              Do you live around here?
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Tag selected={false} onClick={() => void chooseResidency('local')}>
                I live here
              </Tag>
              <Tag selected={false} onClick={() => void chooseResidency('visitor')}>
                I&apos;m visiting
              </Tag>
            </div>
            <p
              style={{
                font: 'var(--type-caption)',
                color: 'var(--text-muted)',
                marginTop: 'var(--space-2)',
              }}
            >
              We keep local and visitor rankings apart, and show both counts. We ask rather than
              guess from your location — being here today does not mean you live here.
            </p>
          </div>
        )}

        {DOOR_SECTIONS.map(({ door, heading }) => {
          const nearby = nearbyByDoor[door];
          return (
            <div
              key={door}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              <h3 style={{ font: 'var(--type-label)', margin: 0 }}>{heading}</h3>
              {nearby.isLoading ? (
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <PickSkeleton />
                  <PickSkeleton />
                </div>
              ) : (nearby.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon="map-pin-off"
                  title="Nothing to rank yet"
                  body={
                    hasMapsApiKey()
                      ? 'We could not load places near you right now. You can rank anything later, straight from its page.'
                      : 'Live place search is not configured, so there is nothing to list here yet.'
                  }
                />
              ) : (
                <ul
                  className="madli-stagger"
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'grid',
                    // P13 §2: these were single-column, text-only rows —
                    // half the visual weight of any real pick shown
                    // elsewhere in the app (PickCard's own photo + name +
                    // reason), for the exact same kind of decision ("have
                    // you been here"). A real photo, a bigger name, and a
                    // proper 2-up (desktop) grid puts these on equal
                    // footing with everything else someone rates places on.
                    gridTemplateColumns:
                      breakpoint === 'desktop' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                    gap: 'var(--space-5)',
                  }}
                >
                  {nearby.data?.map((candidate) => {
                    const chosen = ranked[candidate.placeId];
                    return (
                      <li key={candidate.placeId}>
                        <Card padding={0} style={{ overflow: 'hidden', height: '100%' }}>
                          <PhotoFrame
                            src={candidate.photoUrl}
                            label={candidate.name}
                            alt={candidate.name}
                            ratio="16 / 9"
                            radius="0"
                            className="madli-hover-zoom"
                          />
                          <div style={{ padding: 'var(--space-5)' }}>
                            <div
                              style={{
                                font: 'var(--type-h3)',
                                letterSpacing: 'var(--tracking-display)',
                                color: 'var(--text-heading)',
                                marginBottom: 4,
                              }}
                            >
                              {candidate.name}
                            </div>
                            <div
                              style={{
                                font: 'var(--type-body-sm)',
                                color: 'var(--evidence-text)',
                                marginBottom: 'var(--space-4)',
                              }}
                            >
                              {candidate.address}
                            </div>
                            <div
                              style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}
                            >
                              {TIERS.map((t) => (
                                <Tag
                                  key={t.tier}
                                  selected={chosen === t.tier}
                                  onClick={() => void toggleRate(candidate, door, t.tier)}
                                >
                                  {t.label}
                                </Tag>
                              ))}
                              {chosen ? (
                                <span
                                  style={{
                                    font: 'var(--type-caption)',
                                    color: 'var(--text-muted)',
                                    alignSelf: 'center',
                                  }}
                                >
                                  Saved — tap again to undo
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: 320 }}
        >
          <Button onClick={done}>
            {rankedCount > 0 ? `Done — ${rankedCount} ranked` : 'Continue'}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
