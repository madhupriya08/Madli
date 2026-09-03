import { MarketingShell } from '../layout/MarketingShell';

const SECTION: React.CSSProperties = {
  maxWidth: 'var(--prose-max)',
  margin: '0 auto',
  padding: 'var(--section-y) var(--gutter)',
};

const P: React.CSSProperties = {
  font: 'var(--type-body-lg)',
  color: 'var(--text-body)',
  marginBottom: 'var(--space-5)',
};

const H2: React.CSSProperties = {
  font: 'var(--type-h4)',
  color: 'var(--text-heading)',
  marginTop: 'var(--space-7)',
  marginBottom: 'var(--space-3)',
};

/**
 * P14: a real, product-specific draft — not filler unrelated to what this
 * app actually does. Early-stage terms for an early-stage product; expect
 * real legal review before this is the final word for anyone.
 */
export function TermsPage() {
  return (
    <MarketingShell>
      <section style={SECTION}>
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 'var(--space-6)' }}>Terms</h1>
        <p style={P}>
          Madli is an early version of a product still being built. These terms cover the
          essentials for using it today; expect them to be revisited as the product matures.
        </p>

        <h2 style={{ ...H2, marginTop: 0 }}>Your account</h2>
        <p style={P}>
          You&apos;re responsible for keeping your account credentials to yourself and for what
          happens under your account. You can delete it at any time from your privacy settings.
        </p>

        <h2 style={H2}>Ranking honestly</h2>
        <p style={P}>
          Rankings only mean something if they&apos;re real. Don&apos;t rank places you haven&apos;t
          actually been to, and don&apos;t create multiple accounts to inflate or deflate a
          place&apos;s standing. We reserve the right to remove rankings, or accounts, that break
          this.
        </p>

        <h2 style={H2}>No pay-to-rank</h2>
        <p style={P}>
          Nothing on Madli can be purchased. A business cannot pay for a better rank, more visible
          placement, or the removal of a bad one.
        </p>

        <h2 style={H2}>What you can rely on, and what you can&apos;t</h2>
        <p style={P}>
          Madli aims for real, current information, but places close, hours change, and rankings
          shift as more people weigh in. Treat every pick as a strong starting point, not a
          guarantee, and always confirm anything time-sensitive (hours, availability) directly
          with the place itself before you go.
        </p>

        <h2 style={H2}>Changes</h2>
        <p style={{ ...P, marginBottom: 0 }}>
          As Madli grows we&apos;ll update these terms, and this page will always reflect the
          current version.
        </p>
      </section>
    </MarketingShell>
  );
}
