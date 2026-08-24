import { MarketingShell } from '../layout/MarketingShell';
import { PickCard } from '../../components/trust/PickCard';
import { places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';

// S2: placed before signup on purpose — the mechanic is the pitch. The live
// PickCard row here is the same component the app uses; what's described is
// what ships.
export function HowItWorksPage() {
  const sample = places.filter((p) => p.type === 'eat' && p.locals >= 50).slice(0, 3);
  return (
    <MarketingShell>
      <section
        style={{
          maxWidth: 'var(--prose-max)',
          margin: '0 auto',
          padding: 'var(--section-y) var(--gutter)',
        }}
      >
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 'var(--space-5)' }}>
          How Madli ranks a pick
        </h1>
        <p
          style={{
            font: 'var(--type-body-lg)',
            color: 'var(--text-body)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Every place on Madli is ranked by locals, not by a star average. When someone logs a
          visit, we run a quick binary comparison against their existing list — that's the whole
          mechanic. Three picks come out the other end, each with the reason a local gave for it.
        </p>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
          We print the gap between picks honestly — a close call is labelled a close call, and a
          place with fewer than about 50 local ratings is never called a pick at all.
        </p>
      </section>
      <section
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: '0 var(--gutter) var(--section-y)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-5)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {sample.map((p, i) => (
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
      </section>
    </MarketingShell>
  );
}
