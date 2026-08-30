import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layout/AppShell';
import { Icon } from '../../components/core/Icon';
import { PhotoFrame } from '../../components/core/PhotoFrame';
import { RankBadge } from '../../components/trust/RankBadge';
import { RankGap } from '../../components/trust/RankGap';
import { SampleSize } from '../../components/trust/SampleSize';
import { ReasonNote } from '../../components/trust/ReasonNote';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { Dialog } from '../../components/feedback/Dialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PickSkeleton } from '../../components/feedback/Skeleton';
import { usePersona } from '../../dev/PersonaContext';
import { places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import { placePhotoUrl } from '../../lib/placePhoto';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import { fetchPlaceDetails, type GooglePlaceDetails } from '../../lib/placesSearch';
import { pickReason } from '../../data/hybridPicks';
import { distanceUnitForCountry, useSearch } from '../../lib/searchState';
import { fetchRoute } from '../../lib/routes';
import {
  isGooglePlaceSaved,
  removeSavedGooglePlace,
  saveGooglePlace,
} from '../../lib/savedGooglePlaces';
import { useAddBookmark, useBookmarks, useRemoveBookmark } from '../../data/hooks';

/**
 * The prototype gates this exact modal behind three separate guest actions —
 * bookmarking, the bridge-tap card, and (implicitly) anything else that
 * needs an account — all setting the same `modal: "signup"` state with this
 * same copy. Only the bridge tap is wired here; bookmarking already has its
 * own guest treatment (hidden button / "Sign up to save" button) that this
 * round was not asked to change.
 */
function SignupNeededDialog({
  open,
  onClose,
  breakpoint,
  onSignup,
}: {
  open: boolean;
  onClose: () => void;
  breakpoint: string;
  onSignup: () => void;
}) {
  return (
    <Dialog
      open={open}
      title="This one needs an account"
      onClose={onClose}
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
    >
      <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-5)' }}>
        Saving, two-stop plans and your ranked list are the parts we have to store. Everything you
        have done so far carries over.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button onClick={onSignup}>Sign up</Button>
        <Button variant="ghost" onClick={onClose}>
          Continue as guest
        </Button>
      </div>
    </Dialog>
  );
}

function sectionCard(children: ReactNode) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 'var(--space-5)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--white)',
      }}
    >
      {children}
    </div>
  );
}

function eyebrow(label: string) {
  return (
    <div
      style={{
        font: 'var(--type-eyebrow)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-eyebrow)',
        color: 'var(--text-muted)',
      }}
    >
      {label}
    </div>
  );
}

function practicalRow(label: string, value: string | undefined | null) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>{label}</span>
      <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>{value}</span>
    </div>
  );
}

/**
 * S19 place detail — layout follows the design handoff prototype.
 * No Menu / Website / Claim. Directions opens Google Maps directly.
 */
export function PlaceDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isSharedLink = searchParams.get('shared') === '1';
  const navigate = useNavigate();
  const { breakpoint, persona, userId } = usePersona();
  const { data: bookmarks = [] } = useBookmarks(userId);
  const addBookmark = useAddBookmark(userId);
  const removeBookmark = useRemoveBookmark(userId);
  const [, setSaveTick] = useState(0);
  const { search, effectiveCenter } = useSearch();

  const decodedSlug = slug ? decodeURIComponent(slug) : undefined;
  const place = places.find((p) => p.slug === decodedSlug);
  const googleQuery = useQuery({
    queryKey: ['googlePlace', decodedSlug],
    queryFn: () => fetchPlaceDetails(decodedSlug!),
    enabled: Boolean(decodedSlug) && !place,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const googlePlace = googleQuery.data;

  const dest =
    place?.lat != null && place.lng != null
      ? { lat: place.lat, lng: place.lng }
      : googlePlace?.location;
  // place.drive (a catalogue fixture's pre-written line) is available
  // synchronously from render — only the Google-place fallback route needs
  // a fetch, so only that half lives in state; the synchronous half is
  // derived below rather than pushed through setState in the effect.
  const [fetchedDriveLine, setFetchedDriveLine] = useState<string | null>(null);
  const driveLine = place?.drive ?? fetchedDriveLine;

  useEffect(() => {
    if (!dest || place?.drive) return;
    let cancelled = false;
    fetchRoute(effectiveCenter, dest, distanceUnitForCountry(search.countryCode))
      .then((r) => {
        if (!cancelled) setFetchedDriveLine(`${r.durationText} · ${r.distanceText}`);
      })
      .catch(() => {
        if (!cancelled) setFetchedDriveLine(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest?.lat, dest?.lng, place?.drive, effectiveCenter.lat, effectiveCenter.lng]);

  if (!place && googleQuery.isLoading) {
    return (
      <AppShell title="" onBack={() => navigate(-1)}>
        <div style={{ padding: 'var(--space-6) var(--gutter)' }}>
          <PickSkeleton />
        </div>
      </AppShell>
    );
  }

  if (!place && !googlePlace) {
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

  if (place) {
    return (
      <CatalogueDetail
        place={place}
        breakpoint={breakpoint}
        persona={persona}
        isSharedLink={isSharedLink}
        driveLine={driveLine ?? place.drive}
        isBookmarked={bookmarks.some((b) => b.placeId === place.id)}
        onToggleBookmark={() =>
          bookmarks.some((b) => b.placeId === place.id)
            ? removeBookmark.mutate(place.id)
            : addBookmark.mutate(place.id)
        }
        onBack={() => navigate(-1)}
        onShare={() =>
          navigate('/share', {
            state: {
              name: place.name,
              path: `/places/${encodeURIComponent(place.slug)}?shared=1`,
              photoUrl: placePhotoUrl(place.slug, 200, 200),
            },
          })
        }
        onBridge={() => navigate(`/places/${encodeURIComponent(place.slug)}/bridge`)}
        onBeenHere={() => navigate('/log-visit', { state: { placeId: place.id } })}
      />
    );
  }

  return (
    <GoogleDetail
      place={googlePlace!}
      vibe={search.vibe}
      breakpoint={breakpoint}
      persona={persona}
      isSharedLink={isSharedLink}
      driveLine={driveLine}
      isBookmarked={isGooglePlaceSaved(googlePlace!.placeId)}
      onToggleBookmark={() => {
        const g = googlePlace!;
        if (isGooglePlaceSaved(g.placeId)) removeSavedGooglePlace(g.placeId);
        else
          saveGooglePlace({
            placeId: g.placeId,
            name: g.name,
            address: g.address,
            photoUrl: g.photoUrl,
            types: g.types,
          });
        setSaveTick((n) => n + 1);
      }}
      onBack={() => navigate(-1)}
      onShare={() =>
        navigate('/share', {
          state: {
            name: googlePlace!.name,
            path: `/places/${encodeURIComponent(googlePlace!.placeId)}?shared=1`,
            photoUrl: googlePlace!.photoUrl,
          },
        })
      }
      onBridge={() =>
        navigate(`/places/${encodeURIComponent(googlePlace!.placeId)}/bridge`)
      }
      onSignup={() => navigate('/signup')}
    />
  );
}

function CatalogueDetail({
  place,
  breakpoint,
  persona,
  isSharedLink,
  driveLine,
  isBookmarked,
  onToggleBookmark,
  onBack,
  onShare,
  onBridge,
  onBeenHere,
}: {
  place: (typeof places)[number];
  breakpoint: string;
  persona: string;
  isSharedLink: boolean;
  driveLine: string | null | undefined;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onBack: () => void;
  onShare: () => void;
  onBridge: () => void;
  onBeenHere: () => void;
}) {
  const navigate = useNavigate();
  const [showSignupGate, setShowSignupGate] = useState(false);
  const cat = categoryName(place.categoryId);
  const rankLabel = `#2 in ${place.neighborhood} — ${cat}`;
  const handleBridge = () => {
    if (persona === 'guest') {
      setShowSignupGate(true);
      return;
    }
    onBridge();
  };
  const openDirections = () => {
    if (place.lat != null && place.lng != null) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`,
        '_blank',
        'noopener',
      );
      return;
    }
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address || place.name)}`,
      '_blank',
      'noopener',
    );
  };

  const photos = [0, 1, 2, 3].map((i) => ({
    src: placePhotoUrl(`${place.slug}-${i}`, 600, 400),
    label: place.name,
  }));

  return (
    <AppShell title="" onBack={onBack}>
      <div style={{ position: 'relative' }}>
        <PhotoFrame
          src={placePhotoUrl(place.slug, 1400, 700)}
          alt={place.name}
          label={place.name}
          ratio={breakpoint === 'desktop' ? '21 / 9' : '16 / 10'}
          radius="0"
          overlay
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: 'var(--space-6) var(--gutter)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge tone="onImage">{rankLabel}</Badge>
              {isSharedLink ? <Badge tone="onImage">Opened from a shared link</Badge> : null}
              {place.gem ? <Badge tone="onImage">Local gem</Badge> : null}
            </div>
            <h1
              style={{
                margin: 0,
                font: 'var(--type-h2)',
                color: 'var(--text-on-dark)',
                letterSpacing: 'var(--tracking-display)',
              }}
            >
              {place.name}
            </h1>
            <div style={{ font: 'var(--type-body)', color: 'var(--text-on-dark-muted)' }}>
              {[place.neighborhood, place.priceLevel, driveLine].filter(Boolean).join(' · ')}
            </div>
          </div>
        </PhotoFrame>
      </div>

      <div
        style={{
          padding: 'var(--space-6) var(--gutter) var(--space-9)',
          display: 'grid',
          gridTemplateColumns: breakpoint === 'desktop' ? '1fr 1fr' : '1fr',
          gap: 'var(--space-7)',
          alignItems: 'start',
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {photos.map((ph, i) => (
              <div key={i} style={{ width: 150, flex: 'none' }}>
                <PhotoFrame
                  src={ph.src}
                  alt={ph.label}
                  label={ph.label}
                  ratio="16 / 10"
                  radius="var(--radius-md)"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={openDirections}
            style={{
              cursor: 'pointer',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              padding: 0,
              background: 'transparent',
              overflow: 'hidden',
            }}
          >
            {place.lat != null && place.lng != null ? (
              <GoogleMapView
                height={190}
                center={{ lat: place.lat, lng: place.lng }}
                zoom={15}
                markers={[
                  {
                    id: place.id,
                    position: { lat: place.lat, lng: place.lng },
                    title: place.name,
                    rank: 1,
                  },
                ]}
              />
            ) : (
              <div
                style={{
                  height: 190,
                  background: 'var(--teal-50)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: 'var(--teal-600)',
                }}
              >
                <Icon name="map" size={26} />
                <span style={{ font: 'var(--type-label)' }}>Map placeholder — open directions</span>
                <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
                  Real geography is deliberately not drawn
                </span>
              </div>
            )}
          </button>

          {sectionCard(
            <>
              {eyebrow('The practical bit')}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 14,
                }}
              >
                {practicalRow('Per head', place.priceLevel)}
                {practicalRow('Getting there', driveLine)}
                {practicalRow('Open', place.hours || place.servingHours)}
                {practicalRow('Phone', place.phone)}
                {practicalRow('Usual wait', place.waitTime)}
              </div>
              {place.address ? (
                <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
                  {place.address}
                </div>
              ) : null}
              <span style={{ font: 'var(--type-label)', color: 'var(--text-link)', cursor: 'pointer' }}>
                Report wrong information
              </span>
            </>,
          )}

          {place.history
            ? sectionCard(
                <>
                  {eyebrow('History & context')}
                  <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)' }}>
                    {place.history}
                  </p>
                </>,
              )
            : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {eyebrow(place.gem ? 'Why this is a gem' : 'Why this one')}
            <ReasonNote tone={place.gem ? 'gem' : 'plain'}>{place.reason}</ReasonNote>
          </div>

          {place.tags.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {place.tags.map((t) => (
                <Badge key={t} tone="neutral">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}

          {sectionCard(
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <RankBadge rank={2} />
                <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>
                  {rankLabel}
                </span>
              </div>
              <RankGap
                tone={place.gapTone ?? 'clear'}
                points={place.gapPoints ?? undefined}
                comparedTo="#1"
              />
              <SampleSize locals={place.locals} visitors={place.visitors} window="last 90 days" />
            </>,
          )}

          {place.type === 'eat'
            ? sectionCard(
                <>
                  {eyebrow('What to order')}
                  {persona !== 'guest' || isSharedLink ? (
                    <p style={{ margin: 0, font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
                      {/* No per-dish breakdown exists yet — that would need visit-log
                          text mined into named dishes, a real backend feature this
                          round did not build. The one honest number the fixtures
                          already carry (a mention count) stands in for it, rather
                          than a fabricated list of dish names. */}
                      {place.dishes
                        ? `${place.dishes} dishes mentioned by people who have logged a visit here.`
                        : 'Nobody has logged what they ordered here yet.'}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
                          style={{
                            height: 14,
                            borderRadius: 4,
                            background: 'var(--slate-200)',
                            width: '70%',
                          }}
                        />
                        <div
                          style={{
                            height: 14,
                            borderRadius: 4,
                            background: 'var(--slate-200)',
                            width: '54%',
                          }}
                        />
                      </div>
                      <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
                        {place.dishes
                          ? `${place.dishes} dishes mentioned — sign up to see them`
                          : 'Sign up to see what people order'}
                      </span>
                      <Button variant="accent" size="sm" onClick={() => navigate('/signup')}>
                        Sign up to see them
                      </Button>
                    </div>
                  )}
                </>,
              )
            : null}

          <button
            type="button"
            onClick={handleBridge}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 'var(--space-5)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-inverse)',
              color: 'var(--text-on-dark)',
              border: 'none',
              textAlign: 'left',
              font: 'inherit',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: 'var(--type-label)', color: 'var(--text-on-dark)' }}>
                {place.type === 'explore'
                  ? 'The three closest places to eat afterwards'
                  : 'The three closest places worth stopping at afterwards'}
              </span>
              <span style={{ font: 'var(--type-evidence)', color: 'var(--text-on-dark-muted)' }}>
                Three more picks, every stop on one map
              </span>
            </div>
            <span aria-hidden style={{ fontSize: 22, lineHeight: 1 }}>
              ›
            </span>
          </button>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={openDirections}>
              Directions
            </Button>
            <Button variant="secondary" onClick={onShare}>
              Share
            </Button>
            {persona !== 'guest' ? (
              <Button variant="secondary" onClick={onToggleBookmark}>
                {isBookmarked ? 'Saved' : 'Save'}
              </Button>
            ) : null}
            {persona !== 'guest' ? (
              <Button variant="quiet" onClick={onBeenHere}>
                I have been here
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <SignupNeededDialog
        open={showSignupGate}
        onClose={() => setShowSignupGate(false)}
        breakpoint={breakpoint}
        onSignup={() => navigate('/signup')}
      />
    </AppShell>
  );
}

function GoogleDetail({
  place,
  vibe,
  breakpoint,
  persona,
  isSharedLink,
  driveLine,
  isBookmarked,
  onToggleBookmark,
  onBack,
  onShare,
  onBridge,
  onSignup,
}: {
  place: GooglePlaceDetails;
  vibe: string | null;
  breakpoint: string;
  persona: string;
  isSharedLink: boolean;
  driveLine: string | null;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onBack: () => void;
  onShare: () => void;
  onBridge: () => void;
  onSignup: () => void;
}) {
  const [showSignupGate, setShowSignupGate] = useState(false);
  const handleBridge = () => {
    if (persona === 'guest') {
      setShowSignupGate(true);
      return;
    }
    onBridge();
  };
  const type = place.types.find((x) => x !== 'point_of_interest' && x !== 'establishment');
  const typeLabel = type ? type.replace(/_/g, ' ') : undefined;
  const isEatPlace = place.types.some((t) =>
    ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'bar', 'meal_delivery', 'food'].includes(t),
  );
  const photos =
    place.photoUrls && place.photoUrls.length > 0
      ? place.photoUrls
      : place.photoUrl
        ? [place.photoUrl]
        : [];
  const openHours =
    place.hours
      ?.split(' · ')
      .find((h) => /monday|today/i.test(h))
      ?.replace(/^[^:]+:\s*/, '') ?? place.hours?.split(' · ')[0];
  const ratingLine =
    place.googleRating != null
      ? `${place.googleRating.toFixed(1)} on Google${
          place.reviewCount ? ` · ${place.reviewCount.toLocaleString()} reviews` : ''
        }`
      : null;

  const openDirections = () => {
    const { lat, lng } = place.location;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(place.placeId)}`,
      '_blank',
      'noopener',
    );
  };

  return (
    <AppShell title="" onBack={onBack}>
      <div style={{ position: 'relative' }}>
        <PhotoFrame
          src={photos[0]}
          alt={place.name}
          label={place.name}
          ratio={breakpoint === 'desktop' ? '21 / 9' : '16 / 10'}
          radius="0"
          overlay
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: 'var(--space-6) var(--gutter)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {isSharedLink ? <Badge tone="onImage">Opened from a shared link</Badge> : null}
            <h1
              style={{
                margin: 0,
                font: 'var(--type-h2)',
                color: 'var(--text-on-dark)',
                letterSpacing: 'var(--tracking-display)',
              }}
            >
              {place.name}
            </h1>
            <div style={{ font: 'var(--type-body)', color: 'var(--text-on-dark-muted)' }}>
              {[typeLabel, driveLine, ratingLine].filter(Boolean).join(' · ')}
            </div>
          </div>
        </PhotoFrame>
      </div>

      <div
        style={{
          padding: 'var(--space-6) var(--gutter) var(--space-9)',
          display: 'grid',
          gridTemplateColumns: breakpoint === 'desktop' ? '1fr 1fr' : '1fr',
          gap: 'var(--space-7)',
          alignItems: 'start',
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minWidth: 0 }}>
          {photos.length > 1 ? (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {photos.slice(1).map((src, i) => (
                <div key={`${src}-${i}`} style={{ width: 150, flex: 'none' }}>
                  <PhotoFrame
                    src={src}
                    alt={`${place.name} photo ${i + 2}`}
                    label={place.name}
                    ratio="16 / 10"
                    radius="var(--radius-md)"
                  />
                </div>
              ))}
            </div>
          ) : null}
          {place.photoAttributions?.length ? (
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-faint)' }}>
              Photos: {Array.from(new Set(place.photoAttributions)).join(', ')}
            </p>
          ) : null}

          <button
            type="button"
            onClick={openDirections}
            style={{
              cursor: 'pointer',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              padding: 0,
              background: 'transparent',
              overflow: 'hidden',
            }}
          >
            <GoogleMapView
              height={190}
              center={place.location}
              zoom={15}
              markers={[
                {
                  id: place.placeId,
                  position: place.location,
                  title: place.name,
                  rank: 1,
                },
              ]}
            />
          </button>

          {sectionCard(
            <>
              {eyebrow('The practical bit')}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 14,
                }}
              >
                {practicalRow('Getting there', driveLine)}
                {practicalRow('Open', openHours || place.hours)}
                {practicalRow('Phone', place.phone)}
                {practicalRow('On Google', ratingLine)}
              </div>
              {place.address ? (
                <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
                  {place.address}
                </div>
              ) : null}
              <span style={{ font: 'var(--type-label)', color: 'var(--text-link)', cursor: 'pointer' }}>
                Report wrong information
              </span>
            </>,
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {eyebrow('Why this one')}
            <ReasonNote>{pickReason(place, vibe)}</ReasonNote>
          </div>

          {vibe || typeLabel ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {vibe ? <Badge tone="neutral">{vibe}</Badge> : null}
              {typeLabel ? <Badge tone="neutral">{typeLabel}</Badge> : null}
            </div>
          ) : null}

          {sectionCard(
            <>
              {eyebrow('Google reviews')}
              <p style={{ margin: 0, font: 'var(--type-label)', color: 'var(--text-heading)' }}>
                {ratingLine ?? 'No Google rating yet'}
              </p>
              {place.editorialSummary ? (
                <p style={{ margin: 0, font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
                  {place.editorialSummary}
                </p>
              ) : null}
            </>,
          )}

          <button
            type="button"
            onClick={handleBridge}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 'var(--space-5)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-inverse)',
              color: 'var(--text-on-dark)',
              border: 'none',
              textAlign: 'left',
              font: 'inherit',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: 'var(--type-label)', color: 'var(--text-on-dark)' }}>
                {isEatPlace
                  ? 'The three closest places worth stopping at afterwards'
                  : 'The three closest places to eat afterwards'}
              </span>
              <span style={{ font: 'var(--type-evidence)', color: 'var(--text-on-dark-muted)' }}>
                Three more picks, every stop on one map
              </span>
            </div>
            <span aria-hidden style={{ fontSize: 22, lineHeight: 1 }}>
              ›
            </span>
          </button>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={openDirections}>
              Directions
            </Button>
            <Button variant="secondary" onClick={onShare}>
              Share
            </Button>
            {persona !== 'guest' ? (
              <Button variant="secondary" onClick={onToggleBookmark}>
                {isBookmarked ? 'Saved' : 'Save'}
              </Button>
            ) : (
              <Button variant="quiet" onClick={onSignup}>
                Sign up to save
              </Button>
            )}
          </div>
        </div>
      </div>

      <SignupNeededDialog
        open={showSignupGate}
        onClose={() => setShowSignupGate(false)}
        breakpoint={breakpoint}
        onSignup={onSignup}
      />
    </AppShell>
  );
}
