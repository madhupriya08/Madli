import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tabs } from '../../components/navigation/Tabs';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { useBookmarks, usePlans } from '../../data/hooks';
import { placeById } from '../../fixtures/places';

// S23: Places and Plans are one list with a toggle, not two screens — a
// saved bridge-tap pair is just a bookmark with two stops. "Mark as visited"
// feeds straight into S25, so saving and ranking are one loop.
export function BookmarksScreen() {
  const [tab, setTab] = useState<'places' | 'plans'>('places');
  const navigate = useNavigate();
  const { userId } = usePersona();
  const { data: bookmarks = [] } = useBookmarks(userId);
  const { data: plans = [] } = usePlans(userId);

  return (
    <AppShell title="Bookmarks">
      <div style={{ padding: 'var(--space-5) var(--gutter-mobile)' }}>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Tabs
            items={[
              { value: 'places', label: 'Places' },
              { value: 'plans', label: 'Plans' },
            ]}
            value={tab}
            onChange={(v) => setTab(v as 'places' | 'plans')}
          />
        </div>

        {tab === 'places' ? (
          bookmarks.length === 0 ? (
            <EmptyState
              icon="bookmark"
              title="Nothing saved yet"
              body="Bookmark a place from its detail page to see it here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {bookmarks.map((b) => {
                const place = placeById(b.placeId);
                if (!place) return null;
                return (
                  <Card
                    key={b.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{place.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/log-visit', { state: { placeId: place.id } })}
                    >
                      Mark as visited
                    </Button>
                  </Card>
                );
              })}
            </div>
          )
        ) : plans.length === 0 ? (
          <EmptyState
            icon="map"
            title="No plans saved"
            body="Pair a place with an Explore pick from its detail page to save a plan."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {plans.map((p) => (
              <Card key={p.id} interactive onClick={() => navigate(`/plans/${p.id}`)}>
                {p.name ?? 'Saved plan'}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
