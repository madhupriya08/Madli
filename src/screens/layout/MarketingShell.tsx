import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/core/Logo';
import { Button } from '../../components/core/Button';

/** Cream brand-paper background for the marketing site — never mixed with the off-white product background. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-page-warm)', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-5) var(--gutter-mobile)',
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
        }}
      >
        <Link to="/landing" style={{ borderBottom: 'none' }}>
          <Logo variant="wordmark" height={24} />
        </Link>
        <nav style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center' }}>
          <Link
            to="/how-it-works"
            style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}
          >
            How it works
          </Link>
          <Link to="/" style={{ borderBottom: 'none' }}>
            <Button size="sm">Open the app</Button>
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
