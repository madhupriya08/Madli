import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Card } from '../../components/core/Card';
import { Icon } from '../../components/core/Icon';
import { usePersona } from '../../dev/PersonaContext';
import { hasSearchOrigin, useSearch, type Door } from '../../lib/searchState';

// S7: two doors, CSS grid with a 280px minimum so desktop side-by-side and
// mobile stack are the same markup — real divergence starts at S17.
// Personalized state (User only): recent searches + last-used filter set.
const DOORS = [
  {
    value: 'eat' as const,
    label: 'Eat',
    body: 'Breakfast, biryani, cafes — three picks in two minutes.',
    icon: 'utensils',
  },
  {
    value: 'explore' as const,
    label: 'Explore',
    body: 'Lakes, history, nightlife — where to go today.',
    icon: 'map',
  },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const { persona } = usePersona();
  const { search, setSearch } = useSearch();
  const personalized = persona === 'user' || persona === 'owner';

  const openDoor = (door: Door) => {
    // Clear the other door's vibe so Eat chips don't bias an Explore search.
    setSearch({ door, vibe: null });
    if (hasSearchOrigin(search)) {
      navigate('/intake');
      return;
    }
    navigate('/location-permission', { state: { door } });
  };

  return (
    <AppShell title="Madli">
      <div style={{ padding: 'var(--space-6) var(--gutter)' }}>
        <h1 style={{ font: 'var(--type-h2)', marginBottom: 'var(--space-2)' }}>
          {personalized ? 'Welcome back' : 'Where to start?'}
        </h1>
        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Two doors — pick the one you need right now.
        </p>

        {personalized ? (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-6)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ font: 'var(--type-caption)', color: 'var(--text-faint)' }}>
              Recent: Jubilee Hills · Biryani
            </span>
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gap: 'var(--space-5)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {DOORS.map((door) => (
            <Card
              key={door.value}
              interactive
              onClick={() => openDoor(door.value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-9)',
                textAlign: 'center',
              }}
            >
              <Icon name={door.icon} size={32} color="var(--teal-500)" />
              <h2 style={{ font: 'var(--type-h3)' }}>{door.label}</h2>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{door.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
