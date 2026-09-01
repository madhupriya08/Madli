import { useMemo } from 'react';
import { useBookmarks, useVisibleRankedEntries } from './hooks';
import { useMyGoogleRankings } from './googleRankings';
import { listSavedGooglePlaces } from '../lib/savedGooglePlaces';
import { placeById } from '../fixtures/places';
import { inferDoorFromTypes } from '../lib/placesSearch';
import type { PostVisitNudgeSubject } from '../screens/personal/PostVisitNudgeScreen';

/**
 * One bookmarked-but-unranked place, catalogue or Google, for the post-visit
 * nudge (S30) to ask about on Home. Only ever meaningful for a signed-in
 * User — bookmarking itself is gated to signed-in accounts (both the
 * catalogue Save button and the Google Save button hide for Guests on
 * PlaceDetailScreen), so `enabled=false` short-circuits before any of this
 * runs rather than surfacing a Guest's (nonexistent) bookmarks.
 *
 * A catalogue place ranked as 'disliked' drops out of
 * `useVisibleRankedEntries` (S31's own documented behaviour) but stays
 * logged — this can re-offer a nudge for a place someone already ranked and
 * disliked. A real, disclosed simplification: re-confirming "yes I went, I
 * disliked it" once more is harmless, unlike silently never asking again
 * about a place someone bookmarked but has in fact already told Madli about.
 */
export function usePostVisitNudgeCandidate(
  userId: string,
  enabled: boolean,
): PostVisitNudgeSubject | null {
  const bookmarks = useBookmarks(enabled ? userId : '');
  const rankedEntries = useVisibleRankedEntries(enabled ? userId : '');
  const googleRankings = useMyGoogleRankings(undefined, enabled);

  return useMemo(() => {
    if (!enabled) return null;
    if (!bookmarks.data || !rankedEntries.data) return null;

    const rankedCataloguePlaceIds = new Set(rankedEntries.data.map((e) => e.placeId));
    const catalogueCandidate = bookmarks.data.find(
      (b) => !rankedCataloguePlaceIds.has(b.placeId),
    );
    if (catalogueCandidate) {
      const place = placeById(catalogueCandidate.placeId);
      if (place) return { kind: 'catalogue', placeId: place.id, placeName: place.name };
    }

    if (!googleRankings.data) return null;
    const rankedGooglePlaceIds = new Set(googleRankings.data.map((r) => r.googlePlaceId));
    const googleCandidate = listSavedGooglePlaces().find(
      (g) => !rankedGooglePlaceIds.has(g.placeId),
    );
    if (googleCandidate) {
      return {
        kind: 'google',
        placeId: googleCandidate.placeId,
        placeName: googleCandidate.name,
        door: inferDoorFromTypes(googleCandidate.types),
        types: googleCandidate.types,
      };
    }

    return null;
  }, [enabled, bookmarks.data, rankedEntries.data, googleRankings.data]);
}
