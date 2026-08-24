import { useParams } from 'react-router-dom';
import { MarketingShell } from '../layout/MarketingShell';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PickCard } from '../../components/trust/PickCard';
import { areas } from '../../fixtures/areas';
import { places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import { appConfig } from '../../fixtures/appConfig';

// S4: the SEO surface, and the honest one — coverage depth printed per
// neighbourhood. Empty state uses the real threshold: about 50 local ratings
// (try Alwal, which is deliberately below threshold in the design's own intent).
export function NeighbourhoodPage() {
  const { area: areaName } = useParams<{ area: string }>();
  const area = areas.find((a) => a.name === areaName) ?? areas[0];
  const picks = places.filter(
    (p) => p.neighborhood === area.name && p.locals >= appConfig.rankingThresholdLocals,
  );

  return (
    <MarketingShell>
      <section
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: 'var(--section-y) var(--gutter)',
        }}
      >
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 4 }}>{area.name}</h1>
        <p
          style={{
            font: 'var(--type-evidence)',
            color: 'var(--evidence-text)',
            marginBottom: 'var(--space-7)',
          }}
        >
          {area.coverageDepthLabel}
        </p>

        {picks.length === 0 ? (
          <EmptyState
            icon="map-pin-off"
            title="No ranking here yet"
            body={`We need about ${appConfig.rankingThresholdLocals} local ratings before we will call anything a pick. Browse the launch neighbourhoods instead, or tell us to prioritise this one.`}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-5)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            {picks.map((p, i) => (
              <PickCard
                key={p.id}
                rank={(i + 1) as 1 | 2 | 3}
                name={p.name}
                category={categoryName(p.categoryId)}
                neighborhood={p.neighborhood}
                priceLevel={p.priceLevel}
                reason={p.reason}
                gem={p.gem}
                gapTone={p.gapTone ?? 'clear'}
                gapPoints={p.gapPoints ?? undefined}
                locals={p.locals}
                visitors={p.visitors}
                photoLabel={p.name}
              />
            ))}
          </div>
        )}

        <h2 style={{ font: 'var(--type-h3)', margin: 'var(--space-9) 0 var(--space-4)' }}>
          Other neighbourhoods
        </h2>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          {areas.map((a) => (
            <li key={a.id}>
              <a
                href={`/neighbourhoods/${encodeURIComponent(a.name)}`}
                style={{ font: 'var(--type-body-sm)' }}
              >
                {a.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </MarketingShell>
  );
}
