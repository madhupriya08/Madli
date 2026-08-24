import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { PhotoFrame } from '../../components/core/PhotoFrame';
import { RankGap } from '../../components/trust/RankGap';
import { SampleSize } from '../../components/trust/SampleSize';
import { ReasonNote } from '../../components/trust/ReasonNote';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { IconButton } from '../../components/core/IconButton';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import {
  useAddBookmark,
  useBookmarks,
  useRemoveBookmark,
  useBusinessClaims,
  useOwnsVerifiedClaim,
} from '../../data/hooks';

// S19: five role states on one screen. Shared link unlocks everything — no
// cap, no lock — because shared links must open fully with no account and
// never expire. "Is this your business" only renders when unclaimed; on a
// claimed listing the Owner sees an edit affordance in the same slot. Real
// divergence: desktop is two columns with gallery/map on the left; mobile
// stacks with a swipe strip.
export function PlaceDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isSharedLink = searchParams.get('shared') === '1';
  const navigate = useNavigate();
  const { breakpoint, persona, userId } = usePersona();
  const { data: bookmarks = [] } = useBookmarks(userId);
  const addBookmark = useAddBookmark(userId);
  const removeBookmark = useRemoveBookmark(userId);

  const decodedSlug = slug ? decodeURIComponent(slug) : undefined;
  const place = places.find((p) => p.slug === decodedSlug);
  // Real per-place check against the signed-in user's own claims (real
  // owns_verified_claim() RPC) — replaces Phase 2's fixture simplification
  // ("the Owner persona owns whichever place has a verified claim"), so this
  // is correct for any real Owner account, not just the one fixture that
  // happened to match. Verified live end-to-end (submit → admin calls →
  // admin approves → this check flips true for that user) in
  // PHASE_3_COMPLETION_REPORT.md §4.
  const { data: ownsThisClaim = false } = useOwnsVerifiedClaim(place?.id);
  const { data: existingClaims = [] } = useBusinessClaims({ placeId: place?.id });

  if (!place) {
    return (
      <AppShell title="Not found" onBack={() => navigate(-1)}>
        <EmptyState
          icon="map-pin-off"
          title="We can't find that place"
          body="It may have been removed or the link is out of date."
        />
      </AppShell>
    );
  }

  const alreadyVerifiedByAnyone = existingClaims.some((c) => c.status === 'verified');
  const isOwnerOfThis = persona !== 'guest' && ownsThisClaim;
  const guestLocked = persona === 'guest' && !isSharedLink;
  const isBookmarked = bookmarks.some((b) => b.placeId === place.id);

  const media = (
    <PhotoFrame label={place.name} ratio={breakpoint === 'desktop' ? '4 / 3' : '16 / 10'}>
      <div style={{ position: 'absolute', top: 12, left: 12 }}>
        {place.gem ? <Badge tone="onImage">Local gem</Badge> : null}
      </div>
    </PhotoFrame>
  );

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h1 style={{ font: 'var(--type-h2)' }}>{place.name}</h1>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          {categoryName(place.categoryId)} · {place.neighborhood} · {place.priceLevel}
        </p>
      </div>

      {isSharedLink ? (
        <Badge tone="teal">Shared link — no account needed, never expires</Badge>
      ) : null}

      <ReasonNote
        tone={place.gem ? 'gem' : 'plain'}
        label={place.gem ? 'Why this is a gem' : 'Why this one'}
      >
        {place.reason}
      </ReasonNote>

      <RankGap tone={place.gapTone ?? 'clear'} points={place.gapPoints ?? undefined} />
      <SampleSize locals={place.locals} visitors={place.visitors} />

      {guestLocked ? (
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--surface-sunken)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p style={{ font: 'var(--type-body-sm)', marginBottom: 'var(--space-3)' }}>
            Sign up to see what to order and save this place.
          </p>
          <Button onClick={() => navigate('/signup')}>Sign up</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => navigate(`/places/${slug}/bridge`)}>
            Pair with an Explore pick
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/places/${slug}/map`)}>
            Directions
          </Button>
          <IconButton
            icon="share-2"
            label="Share"
            onClick={() => navigate('/share')}
            variant="outline"
          />
          {persona === 'user' ? (
            <IconButton
              icon="bookmark"
              label={isBookmarked ? 'Remove bookmark' : 'Save this place'}
              variant={isBookmarked ? 'solid' : 'outline'}
              onClick={() =>
                isBookmarked ? removeBookmark.mutate(place.id) : addBookmark.mutate(place.id)
              }
            />
          ) : null}
        </div>
      )}

      <div
        style={{
          font: 'var(--type-body-sm)',
          color: 'var(--text-body)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span>{place.address}</span>
        <span>{place.phone}</span>
        <span>{place.hours}</span>
      </div>

      {!alreadyVerifiedByAnyone && persona !== 'guest' && !isOwnerOfThis ? (
        <button
          onClick={() => navigate(`/claim/${slug}`)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-link)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Is this your business?
        </button>
      ) : null}
      {isOwnerOfThis ? (
        <Button variant="secondary" onClick={() => navigate(`/owner/${slug}/edit`)}>
          Edit your listing
        </Button>
      ) : null}
      {persona === 'admin' ? (
        <Button variant="secondary" onClick={() => navigate('/admin/catalogue')}>
          Edit in catalogue (admin)
        </Button>
      ) : null}
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-faint)' }}>
        Signed in as {userId || 'guest'}
      </p>
    </div>
  );

  return (
    <AppShell title="" onBack={() => navigate(-1)}>
      <div
        style={{
          display: breakpoint === 'desktop' ? 'grid' : 'flex',
          flexDirection: breakpoint === 'desktop' ? undefined : 'column',
          gridTemplateColumns: breakpoint === 'desktop' ? '1fr 1fr' : undefined,
          gap: 'var(--space-7)',
          padding: 'var(--space-6) var(--gutter)',
        }}
      >
        {media}
        {content}
      </div>
    </AppShell>
  );
}
