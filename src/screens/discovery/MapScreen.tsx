import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { placeBySlug } from '../../fixtures/places';

// S21: abstract map placeholder — labelled panel, markers by type, dashed
// route with per-leg travel time. "Open in Google Maps" is a handoff, not an
// embed — the exit, so it sits below the in-app actions. Real divergence:
// embedded map (desktop) vs. full-screen map with a bottom sheet (mobile).
export function MapScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  const place = slug ? placeBySlug(decodeURIComponent(slug)) : undefined;

  const mapPanel = (
    <div
      style={{
        flex: breakpoint === 'desktop' ? 1 : undefined,
        height: breakpoint === 'desktop' ? 480 : 260,
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
        Map placeholder — marker for {place?.name ?? 'this place'}, dashed route from you
      </span>
    </div>
  );

  const details = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: breakpoint === 'desktop' ? 0 : 'var(--space-5) var(--gutter-mobile)',
      }}
    >
      <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
        {place?.drive ?? 'Drive time unavailable'}
      </p>
      <Button
        variant="secondary"
        onClick={() =>
          window.open(
            `https://maps.google.com/?q=${encodeURIComponent(place?.address ?? '')}`,
            '_blank',
            'noopener',
          )
        }
      >
        Open in Google Maps
      </Button>
    </div>
  );

  return (
    <AppShell title="Directions" onBack={() => navigate(-1)}>
      {breakpoint === 'desktop' ? (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-6)',
            padding: 'var(--space-6) var(--gutter-desktop)',
          }}
        >
          {mapPanel}
          <div style={{ width: 320 }}>{details}</div>
        </div>
      ) : (
        <div>
          {mapPanel}
          {details}
        </div>
      )}
    </AppShell>
  );
}
