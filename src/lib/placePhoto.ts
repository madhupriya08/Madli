// Stand-in photography.
//
// The handoff ships no photographs — CLAUDE.md says so outright ("No
// photography exists. Every image slot uses PhotoFrame, a labelled
// placeholder"), and the prototype points every image at
// `uploads/madli_sample_images_2/…`, a folder that was never included. So
// every card in the product rendered an empty cream box.
//
// Until real photography is commissioned, this points image slots at Lorem
// Picsum, a free public placeholder service that needs no API key and no
// account. Seeding by slug makes each place keep the *same* photo across
// reloads and across screens, so the app looks stable rather than shuffling
// a new image in on every render.
//
// These are decorative stand-ins, not pictures of the actual businesses.
// Anything user-facing that implies otherwise would be misleading, which is
// why PhotoFrame keeps rendering its "PHOTO — <name>" label over the image.
// Replace this module with real per-place URLs (a `photo_url` column on
// `places`) when real photography exists; nothing else needs to change.
const PLACEHOLDER_HOST = 'https://picsum.photos/seed';

/**
 * A stable placeholder photo URL for a place.
 *
 * @param slug the place's slug — used as the seed, so the photo is deterministic
 * @param width intrinsic width to request
 * @param height intrinsic height to request
 */
export function placePhotoUrl(slug: string, width = 800, height = 500): string {
  // The slug contains a "/" ("restaurants/hotel-shadab"), which would open a
  // new path segment on the placeholder host and 404.
  const seed = encodeURIComponent(slug.replace(/\//g, '-'));
  return `${PLACEHOLDER_HOST}/${seed}/${width}/${height}`;
}
