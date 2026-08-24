import { MarketingShell } from '../layout/MarketingShell';

// S5: plain prose at 66ch. States the ranking model in three paragraphs and
// does not defend it.
export function LegalPage() {
  return (
    <MarketingShell>
      <section
        style={{
          maxWidth: 'var(--prose-max)',
          margin: '0 auto',
          padding: 'var(--section-y) var(--gutter)',
        }}
      >
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 'var(--space-6)' }}>
          How we rank, in plain terms
        </h1>
        <p
          style={{
            font: 'var(--type-body-lg)',
            color: 'var(--text-body)',
            marginBottom: 'var(--space-5)',
          }}
        >
          Madli ranks places by asking locals to compare them, one pair at a time, and keeping an
          honest running order. We do not average star ratings, and we do not sell placement — a
          business cannot pay to rank higher, and an Owner editing their own listing can never touch
          the fields that decide their rank.
        </p>
        <p
          style={{
            font: 'var(--type-body-lg)',
            color: 'var(--text-body)',
            marginBottom: 'var(--space-5)',
          }}
        >
          We say when we don&apos;t know enough. A place needs roughly 50 local ratings before we
          call anything a pick; below that, we say so instead of showing a weak guess. A close call
          between two picks is labelled a close call, not smoothed over.
        </p>
        <p style={{ font: 'var(--type-body-lg)', color: 'var(--text-body)' }}>
          Location history you generate while using Madli is yours to view in your own settings. If
          an administrator ever needs to look at it — for a support ticket, an abuse investigation,
          or a legal request — that read is logged with a reason before the data loads, every time.
        </p>
      </section>
    </MarketingShell>
  );
}
