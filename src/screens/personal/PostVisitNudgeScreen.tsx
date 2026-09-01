import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { RankGooglePlaceForm } from '../../components/ranking/RankGooglePlaceForm';
import type { Door, LatLng } from '../../lib/searchState';

export type PostVisitNudgeSubject =
  | { kind: 'catalogue'; placeId: string; placeName: string }
  | {
      kind: 'google';
      placeId: string;
      placeName: string;
      door: Door;
      location?: LatLng | null;
      areaText?: string | null;
      types?: string[];
    };

interface NavState {
  subject: PostVisitNudgeSubject;
}

// S30: re-engagement, not a review request. Three answers, and only Yes
// costs the person anything. A catalogue subject's Yes routes into S25 (the
// pairwise mechanic, which only understands the 17 seeded places); a real
// (Google-sourced) subject's Yes ranks it in place via the same tier-only
// form the "I've been here" button on its own detail page uses, since S25
// cannot resolve a Google place id.
//
// This subject always comes from the caller (a bookmarked-but-unranked
// place found on Home) — there is no longer a fallback hardcoded fixture
// place, so a direct visit with no state is a dead link, not a demo.
export function PostVisitNudgeScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  const state = location.state as NavState | null;
  const subject = state?.subject;
  const [ranking, setRanking] = useState(false);

  useEffect(() => {
    if (!subject) navigate('/app');
  }, [subject, navigate]);

  if (!subject) return null;

  const done = () => navigate('/app');

  return (
    <Dialog
      open
      title={ranking ? 'Rank this place' : `Did you make it to ${subject.placeName}?`}
      onClose={done}
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
    >
      {ranking && subject.kind === 'google' ? (
        <RankGooglePlaceForm
          candidate={{
            placeId: subject.placeId,
            name: subject.placeName,
            door: subject.door,
            location: subject.location,
            areaText: subject.areaText,
            types: subject.types,
          }}
          onDone={done}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Button
            onClick={() =>
              subject.kind === 'catalogue'
                ? navigate('/log-visit', { state: { placeId: subject.placeId } })
                : setRanking(true)
            }
          >
            Yes, log it
          </Button>
          <Button variant="secondary" onClick={done}>
            Not yet
          </Button>
          <Button variant="ghost" onClick={done}>
            Didn&apos;t go
          </Button>
        </div>
      )}
    </Dialog>
  );
}
