import { MarketingShell } from '../layout/MarketingShell';

// P14: no real support address exists yet — `madli.example` is this repo's
// own established placeholder domain (see supabase/functions/share-preview
// and .env.example's APP_URL fallback), used here for the same reason: a
// clearly-fake domain rather than inventing one that looks real. Swap for a
// real monitored address before this ships.
const CONTACT_EMAIL = 'hello@madli.example';

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

export function ContactPage() {
  return (
    <MarketingShell>
      <section style={SECTION}>
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 'var(--space-6)' }}>Get in touch</h1>
        <p style={P}>
          Found a wrong rank, a broken page, or something that just doesn&apos;t look right? Tell
          us and we&apos;ll look into it.
        </p>
        <p style={P}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ font: 'var(--type-body-lg)' }}>
            {CONTACT_EMAIL}
          </a>
        </p>
        <p style={{ ...P, marginBottom: 0 }}>
          We read every message. Since this is an early version of Madli, response times won&apos;t
          always be instant, but a real person reads and answers everything that comes in.
        </p>
      </section>
    </MarketingShell>
  );
}
