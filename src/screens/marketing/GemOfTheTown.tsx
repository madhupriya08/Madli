import { useState } from 'react';
import { MarketingShell } from '../layout/MarketingShell';
import { PickCard } from '../../components/trust/PickCard';
import { Badge } from '../../components/core/Badge';
import { places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import { placePhotoUrl } from '../../lib/placePhoto';

// S3: view-only for every role, including Admin (curation happens on S47).
// Local rank against outside fame, side by side — the gap is the editorial
// thesis. "new gem" state is for a User who opted into that notification.
export function GemOfTheTownPage() {
  const [variant, setVariant] = useState<'default' | 'new gem'>('default');
  const gem = places.find((p) => p.gem)!;

  return (
    <MarketingShell>
      <section
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: 'var(--section-y) var(--gutter)',
        }}
      >
        {variant === 'new gem' ? (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Badge tone="coral">New gem this week</Badge>
          </div>
        ) : null}
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
        <div style={{ maxWidth: 420, marginBottom: 'var(--space-6)' }}>
          <PickCard
            rank={1}
            name={gem.name}
            category={categoryName(gem.categoryId)}
            neighborhood={gem.neighborhood}
            priceLevel={gem.priceLevel}
            reason={gem.reason}
            gem
            gapTone={gem.gapTone ?? 'clear'}
            gapPoints={gem.gapPoints ?? undefined}
            locals={gem.locals}
            visitors={gem.visitors}
            photoSrc={placePhotoUrl(gem.slug)}
            photoLabel={gem.name}
          />
        </div>
        <p style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
          #4 among locals in {categoryName(gem.categoryId)} · #{gem.outsideFameRank ?? '—'} in
          outside fame
        </p>
        <button
          onClick={() => setVariant(variant === 'default' ? 'new gem' : 'default')}
          style={{
            marginTop: 'var(--space-6)',
            background: 'none',
            border: 'none',
            color: 'var(--text-link)',
            cursor: 'pointer',
            font: 'var(--type-body-sm)',
          }}
        >
          Toggle new-gem state (dev)
        </button>
      </section>
    </MarketingShell>
  );
}
