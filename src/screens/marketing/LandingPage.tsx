import { Link } from 'react-router-dom';
import { MarketingShell } from '../layout/MarketingShell';
import { Button } from '../../components/core/Button';
import { Card } from '../../components/core/Card';
import { PickCard } from '../../components/trust/PickCard';
import { places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';

// S1: hero says the promise in six words; three steps and one gem module.
// No testimonial wall, no logo strip, no counter — none of it has a number behind it.
const STEPS = [
  {
    title: 'Tell us what you’re after',
    body: 'A craving, a mood, or just an area — takes one tap.',
  },
  {
    title: 'Get three picks, not thirty',
    body: 'Ranked by locals, with the gap between them printed.',
  },
  { title: 'Read the one-line reason', body: 'Every pick carries a real, specific "why."' },
];

export function LandingPage() {
  const gem = places.find((p) => p.gem);
  return (
    <MarketingShell>
      <section
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: 'var(--section-y) var(--gutter)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-6)',
        }}
      >
        <h1 style={{ font: 'var(--type-display)', maxWidth: '16ch' }}>
          3 picks. 1 reason. 2 minutes.
        </h1>
        <p style={{ font: 'var(--type-body-lg)', color: 'var(--text-body)', maxWidth: '52ch' }}>
          Madli hands you three ranked picks for food and travel in Hyderabad, each with a one-line
          reason — instead of a list you have to read through yourself.
        </p>
        <Link to="/" style={{ borderBottom: 'none' }}>
          <Button size="lg" variant="accent">
            Find your first pick
          </Button>
        </Link>
      </section>

      <section
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: '0 var(--gutter) var(--section-y)',
          display: 'grid',
          gap: 'var(--space-6)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {STEPS.map((s, i) => (
          <Card key={s.title} elevation="xs">
            <span style={{ font: 'var(--type-eyebrow)', color: 'var(--teal-600)' }}>
              Step {i + 1}
            </span>
            <h3 style={{ font: 'var(--type-h4)', margin: '8px 0' }}>{s.title}</h3>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{s.body}</p>
          </Card>
        ))}
      </section>

      {gem ? (
        <section
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: '0 var(--gutter) var(--section-y)',
          }}
        >
          <h2
            style={{ font: 'var(--type-h2)', textAlign: 'center', marginBottom: 'var(--space-5)' }}
          >
            This week&apos;s gem
          </h2>
          <PickCard
            rank={1}
            name={gem.name}
            category={categoryName(gem.categoryId)}
            neighborhood={gem.neighborhood}
            priceLevel={gem.priceLevel}
            reason={gem.reason}
            gem
            gapTone={gem.gapTone ?? 'clear'}
            gapPoints={gem.gapPoints ?? undefined}
            locals={gem.locals}
            visitors={gem.visitors}
            photoLabel={gem.name}
          />
        </section>
      ) : null}
    </MarketingShell>
  );
}
