import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Switch } from '../../components/forms/Switch';

// S35: straightforward per-user notification preferences.
export function NotificationSettingsScreen() {
  const navigate = useNavigate();
  const [newGems, setNewGems] = useState(true);
  const [postVisit, setPostVisit] = useState(true);
  const [productNews, setProductNews] = useState(false);

  return (
    <AppShell title="Notifications" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter-mobile)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <Switch
          label="New gems near you"
          description="One message when a new gem is found in your area"
          checked={newGems}
          onChange={setNewGems}
        />
        <Switch
          label="Post-visit nudges"
          description="A gentle check-in after you've likely visited a saved place"
          checked={postVisit}
          onChange={setPostVisit}
        />
        <Switch
          label="Product news"
          description="New neighbourhoods, new cities"
          checked={productNews}
          onChange={setProductNews}
        />
      </div>
    </AppShell>
  );
}
