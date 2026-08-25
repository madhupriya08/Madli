import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopBar } from '../../components/navigation/TopBar';
import { TabBar } from '../../components/navigation/TabBar';
import { usePersona } from '../../dev/PersonaContext';

/**
 * UX decision (not specified verbatim in the material available): the bottom
 * TabBar's four destinations. The design system's TabBar component and its
 * "four destinations" doc comment confirm a bottom nav exists, but the exact
 * tab set/icons aren't given in the README's screen tables — chosen here from
 * the confirmed Lucide icon list (map-pin, search, bookmark, user).
 */
const TABS = [
  { value: 'home', label: 'Home', icon: 'map-pin', path: '/app' },
  { value: 'search', label: 'Search', icon: 'search', path: '/search' },
  { value: 'bookmarks', label: 'Saved', icon: 'bookmark', path: '/bookmarks' },
  { value: 'profile', label: 'Profile', icon: 'user', path: '/profile' },
];

export interface AppShellProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  showTabBar?: boolean;
  children: ReactNode;
}

/** Shared chrome for consumer app screens: sticky TopBar + optional bottom TabBar. */
export function AppShell({
  title,
  subtitle,
  onBack,
  trailing,
  showTabBar = true,
  children,
}: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { persona, breakpoint } = usePersona();
  const activeTab = TABS.find((t) => t.path === location.pathname)?.value;
  const isDesktop = breakpoint === 'desktop';
  const showNav = showTabBar && persona !== 'guest';

  // Design decision, flagged: the handoff specifies a bottom tab bar but
  // never says where primary nav lives on the 1280 canvas. Stretched across
  // a 1160px column, four bottom-anchored destinations sit a screen-height
  // away from the content and read as scattered words rather than a bar, so
  // desktop moves them into the top bar — the same four destinations, the
  // same routes, one row instead of a full-width strip. Mobile is unchanged.
  const desktopNav =
    showNav && isDesktop ? (
      <nav aria-label="Primary" style={{ display: 'flex', gap: 'var(--space-5)' }}>
        {TABS.map((t) => {
          const active = t.value === activeTab;
          return (
            <button
              key={t.value}
              onClick={() => navigate(t.path)}
              aria-current={active ? 'page' : undefined}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 2px',
                font: 'var(--type-body-sm)',
                fontWeight: active ? 'var(--weight-demi)' : 'var(--weight-book)',
                color: active ? 'var(--teal-500)' : 'var(--text-muted)',
                transition: 'var(--transition-color)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    ) : null;

  const topBarTrailing =
    desktopNav || trailing ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {desktopNav}
        {trailing}
      </div>
    ) : undefined;

  return (
    // --app-max is the responsive alias (see tokens/spacing.css): the 390px
    // phone frame below 1024px, the 1160px content cap above it. The bars
    // sit inside this column rather than spanning the viewport, so the
    // chrome stays aligned with the content it belongs to instead of
    // stretching across an empty desktop canvas.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        maxWidth: 'var(--app-max)',
        margin: '0 auto',
      }}
    >
      <TopBar title={title} subtitle={subtitle} onBack={onBack} trailing={topBarTrailing} />
      <main style={{ flex: 1 }}>{children}</main>
      {showNav && !isDesktop ? (
        <TabBar
          items={TABS}
          value={activeTab}
          onChange={(v) => navigate(TABS.find((t) => t.value === v)?.path ?? '/')}
        />
      ) : null}
    </div>
  );
}
