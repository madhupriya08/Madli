import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePersona, type AdminTier, type Persona } from './PersonaContext';
import { screenRegistry } from '../screens/registry';
import { Icon } from '../components/core/Icon';
import { Badge } from '../components/core/Badge';

const PERSONAS: { value: Persona; label: string }[] = [
  { value: 'guest', label: 'Guest' },
  { value: 'user', label: 'User' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
];

const ADMIN_TIERS: { value: AdminTier; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'catalogue', label: 'Catalogue' },
  { value: 'moderation', label: 'Moderation' },
];

/**
 * Dev-only persona/breakpoint/state harness (§7 of the Phase 2 prompt) —
 * stripped from any production build via import.meta.env.PROD below. Mirrors
 * the design prototype's own left-rail switcher: persona, breakpoint, and an
 * "All screens" tray, since that's the only practical way to review 52
 * screens without 200 manual logins against a real backend.
 *
 * Opt-in, not on-by-default: `npm run dev` should show the same app a real
 * visitor gets, so the rail only appears when VITE_DEV_HARNESS=1 is set
 * (`npm run dev:harness`, and Playwright's own webServer for the
 * accessibility/keyboard specs, which drive personas through it).
 */
export function DevHarness({ children }: { children: ReactNode }) {
  const persona = usePersona();
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const frameWidth = persona.breakpoint === 'mobile' ? 390 : 1280;

  const content = (
    <div
      style={{
        width: frameWidth,
        maxWidth: '100%',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'var(--bg-page)',
        boxShadow: persona.breakpoint === 'mobile' ? '0 0 0 1px var(--border-hairline)' : 'none',
      }}
    >
      {children}
    </div>
  );

  // Neither production nor a plain `npm run dev` renders this wrapper at all
  // — not even the frame div `content` uses. That frame's width came from
  // `persona.breakpoint`, which until this change no visitor could ever
  // influence, so a real build was permanently stuck at its 'mobile' default
  // (390px) no matter the screen — every screen got force-narrowed on
  // desktop. Width now belongs to the shells (AppShell's responsive
  // --app-max column, AdminShell's and MarketingShell's own full-width
  // layouts), driven by a real media query, so the bare children are
  // returned here and the app looks the same in dev as in production.
  if (import.meta.env.PROD || import.meta.env.VITE_DEV_HARNESS !== '1') {
    return children;
  }

  const filtered = screenRegistry.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.id.toLowerCase().includes(filter.toLowerCase()),
  );
  const grouped = new Map<string, typeof screenRegistry>();
  for (const s of filtered) {
    const list = grouped.get(s.group) ?? [];
    list.push(s);
    grouped.set(s.group, list);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--slate-100)' }}>
      <aside
        style={{
          width: open ? 260 : 44,
          flex: '0 0 auto',
          background: 'var(--teal-900)',
          color: 'var(--text-on-dark)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          padding: open ? 'var(--space-4)' : 'var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Collapse dev harness' : 'Expand dev harness'}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          <Icon name={open ? 'chevron-left' : 'chevron-right'} size={18} color="currentColor" />
        </button>
        {open ? (
          <>
            <div>
              <Badge tone="onImage">Dev harness</Badge>
            </div>

            <section>
              <h4
                style={{
                  font: 'var(--type-label)',
                  marginBottom: 6,
                  color: 'var(--text-on-dark-muted)',
                }}
              >
                Persona
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PERSONAS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => persona.setPersona(p.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-on-dark)',
                      background: persona.persona === p.value ? 'var(--teal-500)' : 'transparent',
                      color: 'var(--white)',
                      cursor: 'pointer',
                      font: 'var(--type-body-sm)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            {persona.persona === 'admin' ? (
              <section>
                <h4
                  style={{
                    font: 'var(--type-label)',
                    marginBottom: 6,
                    color: 'var(--text-on-dark-muted)',
                  }}
                >
                  Admin tier
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {ADMIN_TIERS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => persona.setAdminTier(t.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-on-dark)',
                        background:
                          persona.adminTier === t.value ? 'var(--sky-300)' : 'transparent',
                        color: persona.adminTier === t.value ? 'var(--teal-900)' : 'var(--white)',
                        cursor: 'pointer',
                        font: 'var(--type-body-sm)',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    font: 'var(--type-caption)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={persona.canOverrideRanking}
                    onChange={(e) => persona.setCanOverrideRanking(e.target.checked)}
                  />
                  can_override_ranking
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    font: 'var(--type-caption)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={persona.canAccessLocationHistory}
                    onChange={(e) => persona.setCanAccessLocationHistory(e.target.checked)}
                  />
                  can_access_location_history
                </label>
              </section>
            ) : null}

            <section>
              <h4
                style={{
                  font: 'var(--type-label)',
                  marginBottom: 6,
                  color: 'var(--text-on-dark-muted)',
                }}
              >
                Breakpoint
              </h4>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => persona.setBreakpoint('mobile')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-on-dark)',
                    background: persona.breakpoint === 'mobile' ? 'var(--teal-500)' : 'transparent',
                    color: 'var(--white)',
                    cursor: 'pointer',
                    font: 'var(--type-body-sm)',
                  }}
                >
                  Mobile 390
                </button>
                <button
                  onClick={() => persona.setBreakpoint('desktop')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-on-dark)',
                    background:
                      persona.breakpoint === 'desktop' ? 'var(--teal-500)' : 'transparent',
                    color: 'var(--white)',
                    cursor: 'pointer',
                    font: 'var(--type-body-sm)',
                  }}
                >
                  Desktop 1280
                </button>
              </div>
            </section>

            <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <h4
                style={{
                  font: 'var(--type-label)',
                  marginBottom: 6,
                  color: 'var(--text-on-dark-muted)',
                }}
              >
                All screens ({screenRegistry.length})
              </h4>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter…"
                style={{
                  marginBottom: 8,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-on-dark)',
                  background: 'transparent',
                  color: 'var(--white)',
                  font: 'var(--type-body-sm)',
                }}
              />
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...grouped.entries()].map(([group, screens]) => (
                  <div key={group}>
                    <div
                      style={{
                        font: 'var(--type-eyebrow)',
                        color: 'var(--text-on-dark-muted)',
                        marginBottom: 4,
                      }}
                    >
                      {group}
                    </div>
                    {screens.map((s) => (
                      <Link
                        key={s.id}
                        to={s.path.replace(/:\w+/g, 'restaurants%2Fhotel-shadab')}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(s.path.replace(/:\w+/g, 'restaurants%2Fhotel-shadab'));
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 6,
                          padding: '4px 6px',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--white)',
                          font: 'var(--type-body-sm)',
                          borderBottom: 'none',
                        }}
                      >
                        <span>{s.name}</span>
                        <span style={{ color: 'var(--text-on-dark-muted)' }}>{s.id}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </aside>
      {/* div, not <main> — this is a dev-only device-frame wrapper, and the
          screen inside it (e.g. AdminShell) renders its own <main>; two
          nested <main> landmarks would be invalid, and this wrapper never
          ships to production anyway (see the PROD early-return above). */}
      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto', padding: 'var(--space-6) 0' }}>
        {content}
      </div>
    </div>
  );
}
