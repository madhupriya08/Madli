import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { places } from '../../fixtures/places';

// S34: two columns in the full spec — what claiming does, and what it does
// not. The second is the important one. Verification being a phone call is
// stated up front so nobody hunts for a document upload.
export function ClaimBusinessLinkScreen() {
  const navigate = useNavigate();
  const place = places.find((p) => p.isActive)!;

  return (
    <AppShell title="Claim a business" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        <div>
          <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-2)' }}>
            What claiming does
          </h3>
          <ul style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', paddingLeft: 18 }}>
            <li>Lets you edit hours, phone, address, and description</li>
            <li>Marks the listing as owner-verified</li>
          </ul>
        </div>
        <div>
          <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-2)' }}>
            What it does not do
          </h3>
          <ul style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', paddingLeft: 18 }}>
            <li>Change your rank, category, or reason</li>
            <li>Let you remove reviews or ranking evidence</li>
          </ul>
        </div>
      </div>
      <div style={{ padding: '0 var(--gutter) var(--space-6)' }}>
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Verification is a phone call — we&apos;ll ring the number you give us.
        </p>
        <Button onClick={() => navigate(`/claim/${encodeURIComponent(place.slug)}`)}>
          Start claim
        </Button>
      </div>
    </AppShell>
  );
}
