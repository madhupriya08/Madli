import { Link, useNavigate } from 'react-router-dom';
import { MarketingShell } from '../layout/MarketingShell';
import { Button } from '../../components/core/Button';
import { places } from '../../fixtures/places';
import { areas } from '../../fixtures/areas';

// S1. Ported from the prototype's own S1 block (design_handoff_madli/
// prototype/Madli Prototype.dc.html), which is the authority for this screen
// — not design-system/ui_kits/madli-site/, a separate multi-city marketing
// kit whose copy ("34 cities", Istanbul, Lisbon) describes a product Madli
// isn't.
//
// Two things the prototype's own S1 has that this build deliberately does
// NOT carry over, now that location is open to anywhere rather than one
// city: the "Showing picks for {area} · change" + "Local or visiting?"
// widget (the prototype hardcodes "Hyderabad · 8 neighbourhoods" here —
// there is no honest universal default once the product isn't one city, and
// the "local or visiting" toggle here was decorative, never persisted
// anywhere, and duplicated the real ask S53 already does properly after a
// real area is chosen), and the "Gem of the town" banner — moved to Home
// (S7), which is where the prototype's own S7 block *also* independently
// carries this exact banner, scoped to wherever the person actually is
// rather than shown unconditionally to an anonymous visitor before they
// have picked anywhere.
const HOW_STEPS = [
  {
    n: '1',
    t: 'Tell us who and when',
    b: 'Three chips: who you are with, what the occasion is, and one hard constraint. Ten seconds, not a form.',
  },
  {
    n: '2',
    t: 'Get three, with reasons',
    b: 'Not forty. Three, each carrying the one sentence that explains why it beat the rest, plus how close the next place was.',
  },
  {
    n: '3',
    t: 'Log what you go to',
    b: 'One comparison against a place you already ranked. That is what makes the next set of picks yours instead of everyone’s.',
  },
];

const FOOTER_LINKS = ['About', 'Contact', 'Privacy', 'Terms'];

const SECTION: React.CSSProperties = {
  maxWidth: 'var(--content-max)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--gutter)',
};

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <MarketingShell>
      <section
        style={{
          ...SECTION,
          padding: 'var(--space-9) var(--gutter) var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            font: 'var(--type-eyebrow)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-eyebrow)',
            color: 'var(--teal-600)',
          }}
        >
          {areas.length} neighbourhoods, ranked by the people who live there
        </span>
        <h1 style={{ font: 'var(--type-display)', maxWidth: '15ch', textWrap: 'pretty' }}>
          Three picks. One reason each.
        </h1>
        <p
          style={{
            font: 'var(--type-body-lg)',
            color: 'var(--text-body)',
            maxWidth: 'var(--prose-max)',
          }}
        >
          Madli ranks restaurants and places to visit by asking the people who actually live there —
          not by whoever paid. Every pick comes with the one reason it beat the rest.
        </p>
        {/* All three the same weight, on purpose — matching the same call on
            S6 Splash. Signing up must not read as the "real" path with guest
            browsing tacked on as an afterthought: neither is coral (`accent`
            is reserved for one CTA per view anyway, so it can't badge both),
            neither is smaller. */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="lg" onClick={() => navigate('/signup')}>
            Sign up free
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
            Log in
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/area')}>
            Look around as a guest
          </Button>
        </div>
        <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
          {places.length} places ranked · no account needed to search
        </span>
      </section>

      <section
        style={{ ...SECTION, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
      >
        <div
          style={{
            font: 'var(--type-eyebrow)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-eyebrow)',
            color: 'var(--text-muted)',
          }}
        >
          How it works
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
          {HOW_STEPS.map((s) => (
            <div
              key={s.n}
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
              <p
                style={{
                  font: 'var(--type-body)',
                  color: 'var(--text-body)',
                  maxWidth: 'var(--reason-max)',
                }}
              >
                {s.b}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          ...SECTION,
          padding: 'var(--space-7) var(--gutter) var(--space-8)',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 'var(--space-6)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <img
            src="/design-system/assets/logo-wordmark.png"
            alt="Madli"
            style={{
              height: 18,
              width: 'auto',
              objectFit: 'contain',
              objectPosition: 'left center',
            }}
          />
          <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
            Search anywhere — deep local rankings today go as far as {areas.length} neighbourhoods
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {FOOTER_LINKS.map((l) => (
            <Link key={l} to="/legal" style={{ font: 'var(--type-label)', borderBottom: 'none' }}>
              {l}
            </Link>
          ))}
        </nav>
      </footer>
    </MarketingShell>
  );
}
