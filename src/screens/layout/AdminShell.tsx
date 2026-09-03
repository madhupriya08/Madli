import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/core/Logo';
import { usePersona } from '../../dev/PersonaContext';

// Phase 7: Catalogue, Ranking and trust, Claims, Reports and Location
// history were removed on explicit request — their screens, routes, and
// this nav row all went together, not just the entries here.
const NAV = [
  { label: 'Analytics', path: '/admin' },
  { label: 'Gems', path: '/admin/gems' },
  { label: 'Roles and audit', path: '/admin/roles' },
];

// S41 note: dark teal, no consumer nav, no logo lockup — switching into Admin
// should feel like leaving the app. This shell is never reachable from a
// consumer session's chrome (AppShell), only via /admin/* routes.
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { persona, signOut } = usePersona();

  if (persona !== 'admin') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--teal-900)',
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <p style={{ font: 'var(--type-body-lg)' }}>Admin access required.</p>
        <button
          onClick={() => navigate('/admin/login')}
          style={{ color: 'var(--sky-300)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Go to admin login
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--slate-50)' }}>
      <nav
        style={{
          width: 220,
          flex: '0 0 auto',
          background: 'var(--teal-900)',
          color: 'var(--white)',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        <Logo variant="mark" height={28} style={{ marginBottom: 'var(--space-5)' }} />
        {NAV.map((n) => (
          <Link
            key={n.path}
            to={n.path}
            style={{
              font: 'var(--type-body-sm)',
              color: location.pathname === n.path ? 'var(--white)' : 'var(--text-on-dark-muted)',
              fontWeight:
                location.pathname === n.path ? 'var(--weight-demi)' : 'var(--weight-book)',
              borderBottom: 'none',
              padding: '6px 0',
            }}
          >
            {n.label}
          </Link>
        ))}
        <button
          onClick={() => {
            // Admins land on the marketing page like everyone else, not
            // back on the admin login form.
            void signOut();
            navigate('/');
          }}
          style={{
            marginTop: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-on-dark-muted)',
            cursor: 'pointer',
            textAlign: 'left',
            font: 'var(--type-body-sm)',
          }}
        >
          Sign out
        </button>
      </nav>
      <main
        className="madli-page-enter"
        style={{ flex: 1, minWidth: 0, padding: 'var(--space-7)' }}
      >
        <h1 style={{ font: 'var(--type-h2)', marginBottom: 'var(--space-6)' }}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
