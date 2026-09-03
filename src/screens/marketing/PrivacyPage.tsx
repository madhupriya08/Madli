import { Link } from 'react-router-dom';
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

/** Plain prose, states what's real and does not defend it (see the old LegalPage's own note). */
export function PrivacyPage() {
  return (
    <MarketingShell>
      <section style={SECTION}>
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 'var(--space-6)' }}>Privacy</h1>

        <h2 style={{ ...H2, marginTop: 0 }}>What we collect</h2>
        <p style={P}>
          The searches you run, the places you rank, and (only when you grant it) your location
          while you use Madli, so results can be scoped to where you actually are.
        </p>

        <h2 style={H2}>What we don&apos;t do with it</h2>
        <p style={P}>
          We do not sell placement: a business cannot pay to rank higher, and there is no listing
          edit path that can touch the fields that decide a rank. Your rankings feed the aggregate
          counts everyone sees (&quot;3 locals, 1 visitor&quot;), never your identity alongside
          them.
        </p>

        <h2 style={H2}>Who can see your location history</h2>
        <p style={P}>
          Location history you generate while using Madli is yours to view in your own account
          settings. If an administrator ever needs to look at it, for a support ticket, an abuse
          investigation, or a legal request, that read is logged with a reason before the data
          loads, every time. There is no quiet way to look.
        </p>

        <h2 style={H2}>Your controls</h2>
        <p style={{ ...P, marginBottom: 0 }}>
          Turn location history sharing off, or delete your account and everything tied to it,
          from{' '}
          <Link to="/settings/privacy">your own privacy settings</Link> at any time.
        </p>
      </section>
    </MarketingShell>
  );
}
