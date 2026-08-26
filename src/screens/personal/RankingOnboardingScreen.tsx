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
import { useSearch } from '../../lib/searchState';
import {
  setResidentStatus,
  useRankGooglePlace,
  type RankTier,
  type ResidentStatus,
} from '../../data/googleRankings';
import { track } from '../../lib/analytics';

const TIERS: Array<{ tier: RankTier; label: string }> = [
  { tier: 'loved', label: 'Loved it' },
  { tier: 'fine', label: 'It was fine' },
  { tier: 'disliked', label: 'Not for me' },
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
 * plainly, and it is reachable before answering anything at all.
 */
export function RankingOnboardingScreen() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { search, effectiveCenter } = useSearch();
  const [residency, setResidency] = useState<ResidentStatus | null>(null);
  const [ranked, setRanked] = useState<Record<string, RankTier>>({});
  const rank = useRankGooglePlace();

  const nearby = useQuery({
    queryKey: ['ranking-onboarding-nearby', effectiveCenter.lat, effectiveCenter.lng],
    queryFn: async (): Promise<GoogleCandidate[]> => {
      if (!hasMapsApiKey()) return [];
      // A wide radius and no vibe words on purpose: this is "places you might
      // already know", not a search. Narrowing it to their filters would
      // offer back the same places discovery is about to show them.
      const candidates = await searchCandidates({
        door: 'eat',
        center: effectiveCenter,
        radiusMeters: 8000,
        areaText: search.areaText,
        maxResults: 12,
        clipToRadius: false,
      });
      // Well-known first — you can only rank somewhere you have been, and the
      // busiest places are the ones most people have.
      return [...candidates]
        .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
        .slice(0, 8);
    },
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const chooseResidency = async (status: ResidentStatus) => {
    try {
      await setResidentStatus(status, search.areaText.trim() || null);
      // Only reflect the choice once it is actually stored. Setting it first
      // and swallowing the failure left the chip looking chosen while the
      // profile column stayed null, and every rating after that came back
      // with fn_rank_google_place's 23514 — which reads, verbatim, "set
      // profiles.resident_status before ranking". Confusing on its own, and
      // impossible to act on when the UI insists you already answered.
      setResidency(status);
      track('residency_declared', { status });
    } catch (err) {
      setResidency(null);
      show(err instanceof Error ? err.message : 'Could not save that. Try again in a moment.');
    }
  };

  const rate = async (candidate: GoogleCandidate, tier: RankTier) => {
    if (!residency) {
      show('First, tell us if you live here or are visiting.');
      return;
    }
    try {
      await rank.mutateAsync({
        googlePlaceId: candidate.placeId,
        placeName: candidate.name,
        door: 'eat',
        tier,
        location: candidate.location,
        areaText: search.areaText.trim() || null,
      });
      setRanked((prev) => ({ ...prev, [candidate.placeId]: tier }));
      track('google_place_ranked', { tier, rater_type: residency });
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save that ranking.');
    }
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
        </div>

        <div>
          <h3 style={{ font: 'var(--type-label)', marginBottom: 'var(--space-2)' }}>
            Do you live around here?
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Tag selected={residency === 'local'} onClick={() => void chooseResidency('local')}>
              I live here
            </Tag>
            <Tag selected={residency === 'visitor'} onClick={() => void chooseResidency('visitor')}>
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
            We keep local and visitor rankings apart, and show both counts. We ask rather than guess
            from your location — being here today does not mean you live here.
          </p>
        </div>

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
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            {nearby.data?.map((candidate) => {
              const chosen = ranked[candidate.placeId];
              return (
                <li key={candidate.placeId}>
                  <Card style={{ padding: 'var(--space-4)' }}>
                    <div style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>
                      {candidate.name}
                    </div>
                    <div
                      style={{
                        font: 'var(--type-evidence)',
                        color: 'var(--evidence-text)',
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      {candidate.address}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {TIERS.map((t) => (
                        <Tag
                          key={t.tier}
                          selected={chosen === t.tier}
                          onClick={() => void rate(candidate, t.tier)}
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
                          Saved
                        </span>
                      ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: 320 }}
        >
          <Button onClick={done}>
            {rankedCount > 0 ? `Done — ${rankedCount} ranked` : 'Continue'}
          </Button>
          <button
            onClick={done}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
              font: 'var(--type-body-sm)',
            }}
          >
            Skip for now — you can rank any place from its own page later
          </button>
        </div>
      </div>
    </AppShell>
  );
}
