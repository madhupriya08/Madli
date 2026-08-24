import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Badge } from '../../components/core/Badge';
import { placeBySlug } from '../../fixtures/places';
import { useBusinessClaims } from '../../data/hooks';
import { usePersona } from '../../dev/PersonaContext';

// S38: status pill uses the global pattern. Pending is neutral, never
// amber — waiting is not a warning. Pending copy names the number we'll ring.
export function ClaimStatusScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { userId } = usePersona();
  const place = slug ? placeBySlug(decodeURIComponent(slug)) : undefined;
  const { data: claims = [], isLoading } = useBusinessClaims({ placeId: place?.id, userId });
  const claim = claims[0];
  const notFound = !isLoading && (!place || !claim);

  // Phase 4 §9: navigate() belongs in an effect, not the render body — calling
  // it directly during render (the previous shape here) is a real React
  // anti-pattern that can leave the whole tree unmounted with no
  // ErrorBoundary to catch it (found via an automated accessibility scan
  // hitting exactly this path: a real place with no matching claim, e.g. a
  // stale bookmark or shared link — PHASE_4_QA_REPORT.md §9).
  useEffect(() => {
    if (notFound) navigate(-1);
  }, [notFound, navigate]);

  if (isLoading || notFound) return null;
  // Narrowed by `notFound` above, but TypeScript can't see through that.
  if (!place || !claim) return null;

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
          padding: 'var(--space-6) var(--gutter)',
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
