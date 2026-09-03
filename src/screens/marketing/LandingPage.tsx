import { Link, useNavigate } from 'react-router-dom';
import { MarketingShell } from '../layout/MarketingShell';
import { Button } from '../../components/core/Button';
import { Logo } from '../../components/core/Logo';
import { logEvent } from '../../lib/analytics';
import { useInView } from '../../lib/useInView';

// S1. Ported from the prototype's own S1 block (design_handoff_madli/
// prototype/Madli Prototype.dc.html), which is the authority for this screen
// — not design-system/ui_kits/madli-site/, a separate multi-city marketing
// kit whose copy ("34 cities", Istanbul, Lisbon) describes a product Madli
// isn't.
//
// One thing the prototype's own S1 has that this build deliberately does
// NOT carry over, now that location is open to anywhere rather than one
// city: the "Showing picks for {area} · change" + "Local or visiting?"
// widget (the prototype hardcodes "Hyderabad · 8 neighbourhoods" here —
// there is no honest universal default once the product isn't one city, and
// the "local or visiting" toggle here was decorative, never persisted
// anywhere, and duplicated the real ask S53 already does properly after a
// real area is chosen).
//
// Phase 8 §9: the "Gem of the town" banner, once moved here to Home (S7),
// was removed from Home entirely — with exactly one seeded gem in the whole
// catalogue (Subhan Bakery, Nampally), it was a hardcoded Hyderabad banner
// wearing a "dynamic feature" costume, not something that generalised.
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

const FOOTER_LINKS: Array<{ label: string; to: string }> = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];

const SECTION: React.CSSProperties = {
  maxWidth: 'var(--content-max)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--gutter)',
};

export function LandingPage() {
  const navigate = useNavigate();
  const gemReveal = useInView<HTMLDivElement>();
  const howReveal = useInView<HTMLDivElement>();

  return (
    <MarketingShell>
      <section
        style={{
          background: 'radial-gradient(120% 100% at 15% 0%, var(--teal-50) 0%, transparent 55%)',
        }}
      >
        <div
          className="madli-page-enter"
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
              color: 'var(--teal-700)',
              background: 'var(--teal-50)',
              border: '1px solid var(--teal-100)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 14px',
            }}
          >
            Ranked by real locals
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
            Madli ranks restaurants and places to visit by asking real locals, not by whoever paid.
            Every pick comes with the one reason it beat the rest.
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
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                logEvent('session_started', null);
                navigate('/area');
              }}
            >
              Look around as a guest
            </Button>
          </div>
          <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
            No account needed to search
          </span>
        </div>
      </section>

      {/* P14: "so please do rank the places to allow all users to really
          experience the real gems of the town" — the incentive for why
          ranking matters, stated where someone first lands, not buried in
          the ranking flow itself. Local rankings get priority weight; see
          GemOfTheTownPage for what this produces once enough exist. */}
      <section style={{ ...SECTION, paddingTop: 0, paddingBottom: 0 }}>
        <div
          ref={gemReveal.ref}
          className={`madli-hover-lift ${gemReveal.inView ? 'madli-reveal-in' : 'madli-reveal'}`}
          style={{
            padding: 'var(--space-6)',
            background: 'var(--teal-50)',
            border: '1px solid var(--teal-100)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span style={{ font: 'var(--type-h4)', color: 'var(--text-heading)' }}>
            Every rank surfaces the gems, not just the famous names
          </span>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-body)', maxWidth: '60ch' }}>
            Local rankings carry the most weight, on purpose: the whole point is finding the places
            locals love that outsiders never hear about. Rank a few favourites and you're helping
            surface the next one.
          </p>
        </div>
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
          ref={howReveal.ref}
          className={howReveal.inView ? 'madli-stagger madli-reveal-in' : 'madli-reveal'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
          {HOW_STEPS.map((s) => (
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
          {/* P14: was the flat (non-transparent) logo-wordmark.png, whose
              own baked-in background nearly matches --bg-page-warm — it
              rendered, but close enough to invisible that it read as
              missing. The header already used the transparent version via
              this same Logo component; this just matches it.
              alignSelf: flex-start is load-bearing here — this parent is a
              flex column (default align-items: stretch), and the Logo's own
              width:'auto' does not opt an <img> out of being stretched to
              fill the cross axis; without this the wordmark rendered
              horizontally distorted, stretched to the container's width
              while height stayed pinned. */}
          <Logo variant="wordmark" height={18} style={{ alignSelf: 'flex-start' }} />
          <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
            Search anywhere: deep local rankings grow with every place someone ranks
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              style={{ font: 'var(--type-label)', borderBottom: 'none' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </footer>
    </MarketingShell>
  );
}
