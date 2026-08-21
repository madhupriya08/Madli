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
  { value: 'home', label: 'Home', icon: 'map-pin', path: '/' },
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
  const { persona } = usePersona();
  const activeTab = TABS.find((t) => t.path === location.pathname)?.value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={title} subtitle={subtitle} onBack={onBack} trailing={trailing} />
      <main style={{ flex: 1 }}>{children}</main>
      {showTabBar && persona !== 'guest' ? (
        <TabBar
          items={TABS}
          value={activeTab}
          onChange={(v) => navigate(TABS.find((t) => t.value === v)?.path ?? '/')}
        />
      ) : null}
    </div>
  );
}
