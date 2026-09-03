import { useState } from 'react';
import { Button } from '../core/Button';
import { Tag } from '../core/Tag';
import { RankBadge } from '../trust/RankBadge';
import { useToast } from '../feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import type { Door, LatLng } from '../../lib/searchState';
import {
  pickGoogleComparisonTargets,
  setResidentStatus,
  useMyGoogleRankings,
  useRankGooglePlace,
  useResidentStatus,
  type GoogleComparison,
  type RankedGooglePlace,
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
 * The ranking mechanic (fn_rank_google_place) applied to one real place —
 * shared by "I've been here" on a place detail page, the post-visit nudge,
 * and the ranking-onboarding list, so all three write through the same
 * table (google_place_rankings) rather than forking the mechanic per entry
 * point. (The retired catalogue-only S25-27 flow used to be the other half
 * of this split; it is gone, this is the only ranking path left.)
 *
 * P12 §9: it asks two things now, not one. First "how was it" — the three
 * tiers in the design's own Rank-this-place card. Then, when the person
 * already has comparable places ranked, "which do you prefer" against their
 * existing list *in the same category* (pickGoogleComparisonTargets), which
 * is what actually decides where the new place lands rather than dropping
 * it at the bottom of its tier every time.
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
  // The tier they chose, held while the comparison questions are answered.
  const [tier, setTier] = useState<RankTier | null>(null);
  const [comparisonStep, setComparisonStep] = useState<1 | 2>(1);
  const [firstAnswer, setFirstAnswer] = useState<GoogleComparison | null>(null);

  const { data: history = [] } = useMyGoogleRankings(candidate.door);
  // Re-ranking a place already on the list must not offer that same place as
  // its own comparison target.
  const others = history.filter((h) => h.googlePlaceId !== candidate.placeId);
  const targets = tier ? pickGoogleComparisonTargets(others, { types: candidate.types, tier }) : {};

  const chooseResidency = async (status: ResidentStatus) => {
    try {
      await setResidentStatus(status, candidate.areaText ?? null);
      setResidencyOverride(status);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save that. Try again in a moment.');
    }
  };

  const submit = async (
    chosenTier: RankTier,
    compare1?: GoogleComparison,
    compare2?: GoogleComparison,
  ) => {
    try {
      const result = await rank.mutateAsync({
        googlePlaceId: candidate.placeId,
        placeName: candidate.name,
        door: candidate.door,
        tier: chosenTier,
        location: candidate.location,
        areaText: candidate.areaText ?? null,
        types: candidate.types,
        compare1,
        compare2,
      });
      setLanded({ position: result.landedPosition, total: result.totalInDoor });
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save that ranking.');
    }
  };

  const rate = async (chosenTier: RankTier) => {
    const nextTargets = pickGoogleComparisonTargets(others, {
      types: candidate.types,
      tier: chosenTier,
    });
    // Nothing comparable ranked yet — the first place in a tier has no
    // head-to-head to answer, so this stays the one-tap flow it was.
    if (!nextTargets.first) {
      await submit(chosenTier);
      return;
    }
    setTier(chosenTier);
    setComparisonStep(1);
    setFirstAnswer(null);
  };

  const answerComparison = async (target: RankedGooglePlace, preferredNew: boolean) => {
    if (!tier) return;
    const answer: GoogleComparison = { googlePlaceId: target.googlePlaceId, preferredNew };
    if (comparisonStep === 1) {
      if (targets.second) {
        setFirstAnswer(answer);
        setComparisonStep(2);
        return;
      }
      await submit(tier, answer);
      return;
    }
    await submit(tier, firstAnswer ?? undefined, answer);
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
          First, tell us if you live here or are visiting. We keep local and visitor rankings
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

  const comparisonTarget = comparisonStep === 1 ? targets.first : targets.second;
  if (tier && comparisonTarget) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ font: 'var(--type-body)', margin: 0 }}>Which do you prefer?</p>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0 }}>
          Comparison {comparisonStep} of {targets.second ? 2 : 1}: this is what places{' '}
          {candidate.name} in your list.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Button
            variant="secondary"
            block
            disabled={rank.isPending}
            onClick={() => void answerComparison(comparisonTarget, true)}
          >
            {candidate.name}
          </Button>
          <Button
            variant="secondary"
            block
            disabled={rank.isPending}
            onClick={() => void answerComparison(comparisonTarget, false)}
          >
            {comparisonTarget.placeName}
          </Button>
        </div>
        <button
          type="button"
          onClick={() =>
            void submit(tier, comparisonStep === 2 ? (firstAnswer ?? undefined) : undefined)
          }
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
          Skip this comparison
        </button>
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
