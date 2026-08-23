import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { useToast } from '../../components/feedback/ToastProvider';
import { useSubmitBusinessClaim } from '../../data/hooks';
import { placeBySlug } from '../../fixtures/places';
import { usePersona } from '../../dev/PersonaContext';

const MAPS_LINK_PATTERN = /^https?:\/\/(www\.)?(maps\.google\.|goo\.gl\/maps)/i;

// S37: three sub-steps in one flow — Maps link, contact number, business
// name and role. The validation error is specific about how to get a Maps
// link rather than just saying invalid.
export function ClaimRequestFormScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const submitClaim = useSubmitBusinessClaim();
  const { userId } = usePersona();
  const { show } = useToast();
  const place = slug ? placeBySlug(decodeURIComponent(slug)) : undefined;

  const [mapsLink, setMapsLink] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [businessName, setBusinessName] = useState(place?.name ?? '');
  const [claimedRole, setClaimedRole] = useState('Owner');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Phase 4 §9: navigate() moved into an effect, not called during render —
  // see ClaimStatusScreen/OwnerEditListingScreen for why (PHASE_4_QA_REPORT.md §9).
  useEffect(() => {
    if (!place) navigate(-1);
  }, [place, navigate]);

  if (!place) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!MAPS_LINK_PATTERN.test(mapsLink)) {
      setError(
        "That doesn't look like a Google Maps link. Open the listing in Google Maps, tap Share, and paste the link here.",
      );
      return;
    }
    if (!contactPhone.trim()) {
      setError('A contact number is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitClaim.mutateAsync({
        userId,
        placeId: place.id,
        businessName,
        contactName: 'You',
        claimedRole,
        contactPhone,
        mapsLink,
      });
      navigate(`/claim/${slug}/status`);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not submit your claim.', { tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Claim this business" onBack={() => navigate(-1)} showTabBar={false}>
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          padding: 'var(--space-6) var(--gutter-mobile)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          maxWidth: 480,
        }}
      >
        <Input
          label="Google Maps link"
          value={mapsLink}
          onChange={(e) => setMapsLink(e.target.value)}
          placeholder="https://maps.google.com/…"
          hint="Open the listing in Google Maps, tap Share, and paste the link here."
          error={error && error.includes('Maps') ? error : undefined}
        />
        <Input
          label="Contact phone number"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          type="tel"
          error={error && error.includes('contact number') ? error : undefined}
        />
        <Input
          label="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <Input
          label="Your role at the business"
          value={claimedRole}
          onChange={(e) => setClaimedRole(e.target.value)}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit claim'}
        </Button>
      </form>
    </AppShell>
  );
}
