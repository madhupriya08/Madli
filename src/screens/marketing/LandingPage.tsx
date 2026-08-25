import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketingShell } from '../layout/MarketingShell';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { PhotoFrame } from '../../components/core/PhotoFrame';
import { places } from '../../fixtures/places';
import { areas } from '../../fixtures/areas';
import { placePhotoUrl } from '../../lib/placePhoto';

// S1. Ported from the prototype's own S1 block (design_handoff_madli/
// prototype/Madli Prototype.dc.html), which is the authority for this screen
// — not design-system/ui_kits/madli-site/, a separate multi-city marketing
// kit whose copy ("34 cities", Istanbul, Lisbon) describes a product Madli
// isn't. Phase 2 built a shortened, centre-aligned stand-in for this screen:
// one CTA instead of three, no eyebrow, no evidence line, no area picker,
// no footer, and the gem as a narrow PickCard rather than the full-width
// inverse banner. All of that is restored here, left-aligned as designed.
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
  const gem = places.find((p) => p.gem);
  // "Showing picks for" reflects the real seeded catalogue rather than a
  // hardcoded string, so the eyebrow's neighbourhood count stays true if the
  // areas table changes.
  const [isLocal, setIsLocal] = useState(true);
  const areaLabel = areas[0]?.name ?? 'Hyderabad';

  const whoChip = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 'var(--radius-pill)',
    cursor: 'pointer',
    font: 'var(--type-body-sm)',
    border: `1px solid ${active ? 'var(--teal-500)' : 'var(--border-hairline)'}`,
    background: active ? 'var(--surface-accent-soft)' : 'transparent',
    color: active ? 'var(--teal-700)' : 'var(--text-muted)',
  });

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
          Hyderabad · {areas.length} neighbourhoods
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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="accent" size="lg" onClick={() => navigate('/signup')}>
            Sign up free
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
            Log in
          </Button>
          <Button variant="quiet" size="lg" onClick={() => navigate('/app')}>
            Look around as a guest
          </Button>
        </div>
        <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
          {places.length} places ranked · no account needed to search
        </span>

        <div
          style={{
            width: '100%',
            padding: 'var(--space-5)',
            background: 'var(--white)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-5)',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => navigate('/area')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              flex: 1,
              minWidth: 200,
              background: 'transparent',
              border: 'none',
              padding: 0,
              textAlign: 'left',
            }}
          >
            <Icon name="map-pin" size={22} color="var(--teal-500)" />
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ font: 'var(--type-evidence)', color: 'var(--text-muted)' }}>
                Showing picks for
              </span>
              <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>
                {areaLabel} · change
              </span>
            </span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              Are you local, or visiting?
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setIsLocal(true)}
                aria-pressed={isLocal}
                style={whoChip(isLocal)}
              >
                Local
              </button>
              <button
                onClick={() => setIsLocal(false)}
                aria-pressed={!isLocal}
                style={whoChip(!isLocal)}
              >
                Visiting
              </button>
            </div>
          </div>
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

      {gem ? (
        <section style={SECTION}>
          <Link
            to="/gem"
            style={{
              borderBottom: 'none',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-6)',
              alignItems: 'center',
              padding: 'var(--space-7)',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--surface-inverse)',
              color: 'var(--white)',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span
                style={{
                  font: 'var(--type-eyebrow)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-eyebrow)',
                  color: 'var(--text-on-dark-muted)',
                }}
              >
                Gem of the town
              </span>
              <span
                style={{
                  font: 'var(--type-h2)',
                  color: 'var(--white)',
                  letterSpacing: 'var(--tracking-display)',
                }}
              >
                {gem.name}
              </span>
              <span
                style={{
                  font: 'var(--type-body-lg)',
                  color: 'var(--text-on-dark-muted)',
                  maxWidth: 'var(--reason-max)',
                }}
              >
                {gem.reason}
              </span>
              <span style={{ font: 'var(--type-evidence)', color: 'var(--text-on-dark-muted)' }}>
                {gem.locals} locals · {gem.visitors} visitors · last 90 days
              </span>
            </span>
            <span style={{ width: 220, justifySelf: 'end' }}>
              <PhotoFrame
                src={placePhotoUrl(gem.slug, 440, 330)}
                alt={gem.name}
                label={gem.name}
                ratio="4 / 3"
              />
            </span>
          </Link>
        </section>
      ) : null}

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
            Hyderabad · more cities when the ranking is deep enough to be worth it
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
