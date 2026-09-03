import { MarketingShell } from '../layout/MarketingShell';

// S2: placed before signup on purpose — the mechanic is the pitch.
//
// P14: this used to show 3 real PickCards sampled from the seed catalogue,
// so "what's described is what ships" was literally true. With the
// catalogue retired there is no fixed sample to draw from any more. The
// step-by-step below replaces it as the visual anchor — it describes the
// real RankGooglePlaceForm mechanic (src/components/ranking/
// RankGooglePlaceForm.tsx) exactly as it behaves, not an invented example.
const MECHANIC_STEPS = [
  {
    n: '1',
    t: 'Say how it was',
    b: 'Loved it, it was fine, or not for me: one tap, right on the place’s own page.',
  },
  {
    n: '2',
    t: 'A quick compare',
    b: 'If you’ve ranked something similar already, one head-to-head decides where the new one lands. Nothing to compare against yet? It’s a one-tap flow.',
  },
  {
    n: '3',
    t: 'It lands, in the open',
    b: 'You see the real position immediately, and a close call gets labelled a close call rather than smoothed over.',
  },
];

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
      <section
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: '0 var(--gutter) var(--section-y)',
        }}
      >
        <div
          className="madli-stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
          {MECHANIC_STEPS.map((s) => (
            <div
              key={s.n}
              className="madli-hover-lift"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 'var(--space-5)',
                background: 'var(--white)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span
                style={{
                  font: 'var(--type-h2)',
                  color: 'var(--teal-500)',
                  letterSpacing: 'var(--tracking-display)',
                }}
              >
                {s.n}
              </span>
              <span style={{ font: 'var(--type-h4)', color: 'var(--text-heading)' }}>{s.t}</span>
              <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>{s.b}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
