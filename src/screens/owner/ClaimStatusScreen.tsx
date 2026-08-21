import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Badge } from '../../components/core/Badge';
import { placeBySlug } from '../../fixtures/places';
import { businessClaimsSeed } from '../../fixtures/admin';

// S38: status pill uses the global pattern. Pending is neutral, never
// amber — waiting is not a warning. Pending copy names the number we'll ring.
export function ClaimStatusScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const place = slug ? placeBySlug(decodeURIComponent(slug)) : undefined;
  const claim = place ? businessClaimsSeed.find((c) => c.placeId === place.id) : undefined;

  if (!place || !claim) {
    navigate(-1);
    return null;
  }

  const tone =
    claim.status === 'verified' ? 'success' : claim.status === 'rejected' ? 'warn' : 'neutral';
  const copy =
    claim.status === 'pending'
      ? `We'll call ${claim.contactPhone} to verify. This usually takes a few days.`
      : claim.status === 'verified'
        ? 'Verified — you can now edit this listing.'
        : 'This claim was not approved. Contact support if you think this is a mistake.';

  return (
    <AppShell title="Claim status" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter-mobile)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <Badge tone={tone}>{claim.status}</Badge>
        </div>
        <h1 style={{ font: 'var(--type-h3)' }}>{place.name}</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>{copy}</p>
        {claim.status === 'verified' ? (
          <button
            onClick={() => navigate(`/owner/${slug}/edit`)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Edit listing
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
