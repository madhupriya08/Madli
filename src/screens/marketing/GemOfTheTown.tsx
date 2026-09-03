import { useQuery } from '@tanstack/react-query';
import { MarketingShell } from '../layout/MarketingShell';
import { PickCard } from '../../components/trust/PickCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useGemOfTheTown } from '../../data/gemOfTheTown';
import { useRankingCounts } from '../../data/googleRankings';
import { fetchPlaceDetails } from '../../lib/placesSearch';

function typeLabel(types: string[]): string | undefined {
  const t = types.find((x) => x !== 'point_of_interest' && x !== 'establishment');
  return t ? t.replace(/_/g, ' ') : undefined;
}

// S3: view-only for every role, including Admin (curation happens on S47).
// Local rank against outside fame, side by side — the gap is the editorial
// thesis. A gem is real now: the Google place with the most "loved"
// rankings from people who told us they live nearby (fn_gem_of_the_town),
// not a fixed row from the retired seed catalogue.
export function GemOfTheTownPage() {
  const gem = useGemOfTheTown();
  const { data: counts } = useRankingCounts(gem.data ? [gem.data.googlePlaceId] : []);
  const detail = useQuery({
    queryKey: ['googlePlace', gem.data?.googlePlaceId, 'gem-of-the-town'],
    queryFn: () => fetchPlaceDetails(gem.data!.googlePlaceId),
    enabled: Boolean(gem.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const place = detail.data;
  const rankingCounts = gem.data ? counts?.[gem.data.googlePlaceId] : undefined;

  return (
    <MarketingShell>
      <section
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: 'var(--section-y) var(--gutter)',
        }}
      >
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 'var(--space-3)' }}>Gem of the town</h1>
        <p
          style={{
            font: 'var(--type-body-lg)',
            color: 'var(--text-body)',
            maxWidth: '60ch',
            marginBottom: 'var(--space-7)',
          }}
        >
          Ranked highly by locals, barely known outside the neighbourhood. That gap is the whole
          point: a gem is a place locals rate far above its outside reputation.
        </p>

        {!gem.data ? (
          <EmptyState
            icon="map-pin-off"
            title="No gem yet"
            body="This fills in once enough locals have ranked places on Madli. Rank a few favourites to help surface the first one."
          />
        ) : (
          <>
            <div style={{ maxWidth: 420, marginBottom: 'var(--space-6)' }}>
              <PickCard
                rank={1}
                name={place?.name ?? gem.data.placeName}
                category={place ? typeLabel(place.types) : undefined}
                neighborhood={place?.address ?? gem.data.areaText ?? undefined}
                reason={`Loved by ${gem.data.lovedLocals} ${gem.data.lovedLocals === 1 ? 'local' : 'locals'} on Madli.`}
                gem
                showStats={false}
                locals={rankingCounts?.locals}
                visitors={rankingCounts?.visitors}
                dataWindow={rankingCounts ? 'ranked on Madli' : ''}
                photoSrc={place?.photoUrl}
                photoLabel={place?.name ?? gem.data.placeName}
              />
            </div>
            {place?.reviewCount != null ? (
              <p style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
                {gem.data.lovedLocals} local{gem.data.lovedLocals === 1 ? '' : 's'} call it a
                favourite, against {place.reviewCount.toLocaleString()} review
                {place.reviewCount === 1 ? '' : 's'} on Google.
              </p>
            ) : null}
          </>
        )}
      </section>
    </MarketingShell>
  );
}
