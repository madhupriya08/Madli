import { useState } from 'react';
import { Button } from '../core/Button';
import { Tag } from '../core/Tag';
import { RankBadge } from '../trust/RankBadge';
import { useToast } from '../feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import type { Door, LatLng } from '../../lib/searchState';
import {
  setResidentStatus,
  useRankGooglePlace,
  useResidentStatus,
  type RankTier,
  type ResidentStatus,
} from '../../data/googleRankings';

const TIERS: Array<{ tier: RankTier; label: string }> = [
  { tier: 'loved', label: 'Loved it' },
  { tier: 'fine', label: 'It was fine' },
  { tier: 'disliked', label: "Didn't like it" },
];

export interface GooglePlaceCandidate {
  placeId: string;
  name: string;
  door: Door;
  location?: LatLng | null;
  areaText?: string | null;
  types?: string[];
}

interface RankGooglePlaceFormProps {
  candidate: GooglePlaceCandidate;
  /** Called once the person has seen their landed position (or chosen to leave it there). */
  onDone: () => void;
}

/**
 * The tier-only ranking mechanic (fn_rank_google_place) applied to one real
 * place, outside the onboarding list it was originally built for — reused
 * here so "I've been here" on a real (Google-sourced) place detail page, and
 * a post-visit nudge for one, both write a real ranking rather than routing
 * through S25-27's pairwise mechanic, which only understands the 17 seeded
 * catalogue places (RankingOnboardingScreen's own comment explains why the
 * two mechanics are deliberately different, not a gap to unify).
 */
export function RankGooglePlaceForm({ candidate, onDone }: RankGooglePlaceFormProps) {
  const { show } = useToast();
  const { userId } = usePersona();
  const existingResidency = useResidentStatus(userId, true);
  const [residencyOverride, setResidencyOverride] = useState<ResidentStatus | null | undefined>(
    undefined,
  );
  const residency =
    residencyOverride !== undefined ? residencyOverride : (existingResidency.data ?? null);
  const rank = useRankGooglePlace();
  const [landed, setLanded] = useState<{ position: number; total: number } | null>(null);

  const chooseResidency = async (status: ResidentStatus) => {
    try {
      await setResidentStatus(status, candidate.areaText ?? null);
      setResidencyOverride(status);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save that. Try again in a moment.');
    }
  };

  const rate = async (tier: RankTier) => {
    try {
      const result = await rank.mutateAsync({
        googlePlaceId: candidate.placeId,
        placeName: candidate.name,
        door: candidate.door,
        tier,
        location: candidate.location,
        areaText: candidate.areaText ?? null,
        types: candidate.types,
      });
      setLanded({ position: result.landedPosition, total: result.totalInDoor });
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save that ranking.');
    }
  };

  if (landed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          textAlign: 'center',
          padding: 'var(--space-4) 0',
        }}
      >
        <RankBadge rank={Math.min(landed.position, 3) as 1 | 2 | 3} size="lg" />
        <p style={{ font: 'var(--type-body)', margin: 0 }}>
          {candidate.name} landed at #{landed.position} out of {landed.total} places you&apos;ve
          ranked in {candidate.door === 'eat' ? 'Eat' : 'Explore'}.
        </p>
        <Button onClick={onDone}>Done</Button>
      </div>
    );
  }

  if (!residency) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ font: 'var(--type-body)', margin: 0 }}>
          First, tell us if you live here or are visiting — we keep local and visitor rankings
          apart.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Tag selected={false} onClick={() => void chooseResidency('local')}>
            I live here
          </Tag>
          <Tag selected={false} onClick={() => void chooseResidency('visitor')}>
            I&apos;m visiting
          </Tag>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <p style={{ font: 'var(--type-body)', margin: 0 }}>How was {candidate.name}?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {TIERS.map((t) => (
          <Button
            key={t.tier}
            variant="secondary"
            block
            disabled={rank.isPending}
            onClick={() => void rate(t.tier)}
          >
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
