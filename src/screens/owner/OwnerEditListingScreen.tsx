import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { useToast } from '../../components/feedback/ToastProvider';
import { useUpdateOwnerListing } from '../../data/hooks';
import { placeBySlug } from '../../fixtures/places';

// S39: the never-affects-ranking reminder is on the screen the Owner uses
// most. Only the real owner-editable allowlist is exposed here — history,
// phone, address, hours (+ eat/explore-only fields) — nothing else, because
// the real trigger (fn_protect_ranking_fields) rejects anything else
// regardless of what the UI shows. Ownership itself is checked server-side
// by RLS on the real write, not client-side here (src/data/places.ts's
// NotAuthorizedError) — this screen has no per-user ownership gate of its
// own by design.
export function OwnerEditListingScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const updateListing = useUpdateOwnerListing();
  const place = slug ? placeBySlug(decodeURIComponent(slug)) : undefined;

  const [history, setHistory] = useState(place?.history ?? '');
  const [phone, setPhone] = useState(place?.phone ?? '');
  const [address, setAddress] = useState(place?.address ?? '');
  const [hours, setHours] = useState(place?.hours ?? '');
  const [waitTime, setWaitTime] = useState(place?.waitTime ?? '');
  const [saving, setSaving] = useState(false);

  // Phase 4 §9: navigate() moved into an effect — calling it during render
  // (the previous shape) is a real React anti-pattern; found via an
  // automated accessibility scan hitting the equivalent guard in
  // ClaimStatusScreen and left the whole tree unmounted with no
  // ErrorBoundary to catch it (PHASE_4_QA_REPORT.md §9).
  useEffect(() => {
    if (!place) navigate(-1);
  }, [place, navigate]);

  if (!place) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateListing.mutateAsync({
        placeId: place.id,
        fields: { history, phone, address, hours, ...(place.type === 'eat' ? { waitTime } : {}) },
      });
      show('Listing updated.');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save changes.', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title={`Edit ${place.name}`} onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          maxWidth: 480,
        }}
      >
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: 'var(--text-muted)',
            background: 'var(--surface-sunken)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          These edits never affect your rank, category, or reason — those are set by Madli's ranking
          process, not editable here.
        </p>
        <Input label="Description" value={history} onChange={(e) => setHistory(e.target.value)} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="Hours" value={hours} onChange={(e) => setHours(e.target.value)} />
        {place.type === 'eat' ? (
          <Input
            label="Typical wait"
            value={waitTime}
            onChange={(e) => setWaitTime(e.target.value)}
          />
        ) : null}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <button
          onClick={() => navigate(`/places/${slug}`, { state: { reportDuplicate: true } })}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-link)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Report a duplicate of this listing
        </button>
      </div>
    </AppShell>
  );
}
