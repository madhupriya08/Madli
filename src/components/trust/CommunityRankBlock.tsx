import { SampleSize } from './SampleSize';
import { useRankingCounts } from '../../data/googleRankings';

export interface CommunityRankBlockProps {
  googlePlaceId: string;
}

/**
 * The locals/visitors trust line for a live Google-sourced place — the same
 * evidence CatalogueDetail's RankGap/SampleSize block gives the 17 seeded
 * places, but computed from real rows in google_place_rankings instead of a
 * stored fixture field, so it works for any place someone has actually
 * ranked, not just the demo catalogue.
 *
 * No RankGap here: that component's tone/bar reads as "how this compares to
 * the #2 spot", and there is no computed position among peers for a live
 * place to back that claim with. Renders nothing until at least one person
 * has ranked this place — a real, honest zero beats a placeholder.
 */
export function CommunityRankBlock({ googlePlaceId }: CommunityRankBlockProps) {
  const { data } = useRankingCounts([googlePlaceId]);
  const counts = data?.[googlePlaceId];
  const total = (counts?.locals ?? 0) + (counts?.visitors ?? 0);
  if (!counts || total === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>
        Ranked by {total === 1 ? '1 person' : `${total} people`} who have been here
      </span>
      <SampleSize locals={counts.locals} visitors={counts.visitors} window="last 90 days" />
    </div>
  );
}
