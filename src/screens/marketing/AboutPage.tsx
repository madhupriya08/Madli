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

/** Distinct from HowItWorksPage (S2): this is who and why, not the mechanic itself. */
export function AboutPage() {
  return (
    <MarketingShell>
      <section style={SECTION}>
        <h1 style={{ font: 'var(--type-h1)', marginBottom: 'var(--space-6)' }}>About Madli</h1>
        <p style={P}>
          Madli ranks restaurants and places to visit by asking the people who actually live
          there, one pairwise comparison at a time, instead of averaging star ratings or selling
          placement to whoever pays. Local rankings carry the most weight, on purpose: the whole
          point is surfacing the places locals love that outsiders never hear about, not just the
          famous names everyone already knows.
        </p>
        <p style={P}>
          It&apos;s built for a specific kind of trip: you&apos;re somewhere, you want to eat or
          see something worth the time, and you&apos;d rather ask someone who actually lives there
          than scroll a wall of four-star reviews. That&apos;s a narrower promise than most
          discovery apps make, and it&apos;s the one we&apos;re keeping for this first version.
        </p>
        <p style={{ ...P, marginBottom: 0 }}>
          Curious how the ranking mechanic actually works?{' '}
          <Link to="/how-it-works">Read how Madli ranks a pick</Link>.
        </p>
      </section>
    </MarketingShell>
  );
}
