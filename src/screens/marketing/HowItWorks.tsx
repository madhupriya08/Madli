import { MarketingShell } from '../layout/MarketingShell';

// S2: placed before signup on purpose — the mechanic is the pitch.
//
// P14: this used to show 3 real PickCards sampled from the seed catalogue,
// so "what's described is what ships" was literally true. With the
// catalogue retired there is no fixed sample to draw from any more — the
// two paragraphs below carry the pitch on their own now rather than showing
// an empty grid where the example cards used to be.
export function HowItWorksPage() {
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
          visit, we run a quick binary comparison against their existing list. That's the whole
          mechanic. Three picks come out the other end, each with the reason a local gave for it.
        </p>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
          We print the gap between picks honestly: a close call is labelled a close call, and a
          place with fewer than about 50 local ratings is never called a pick at all.
        </p>
      </section>
    </MarketingShell>
  );
}
