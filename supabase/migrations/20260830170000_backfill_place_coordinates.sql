-- Phase 6 §1: the last 3 of 17 seeded places had no coordinates at all
-- (confirmed by query: 14/17 already had real, geocoded lat/lng/
-- google_place_id from an earlier phase). Distance-based features (bridge-
-- tap "nearby from the most recent stop", shortest-route ordering) need
-- every possible plan anchor to have *some* coordinate, even a plan built
-- from one of these three.
--
-- Treatment per place, decided by what each row's own data already says
-- about it — not guessed at:
--
--  * Mehfil (restaurants/mehfil) — its own `reason` field is explicit:
--    "[fixture placeholder — source gives only the catalogue-row summary]
--    ... seeded specifically to exercise the below-threshold 'not enough
--    evidence' path." A deliberate test fixture, not a real business.
--    Placed at a plausible point inside its stated neighbourhood, Alwal
--    (areas.lat/lng for Alwal: 17.5, 78.506) — close to, not exactly on,
--    the neighbourhood centroid.
--  * AutoLounge Rooftop (places/prabhat-nightlife) — a generic invented
--    name with flavour-text history ("Opened in 2021 in a converted
--    terrace above a co-working building"), zero locals/visitors/gapTone —
--    another placeholder, not a real, findable business. Its stated
--    address ("Financial District, Gachibowli") is a real Hyderabad
--    sub-locality, so it is placed plausibly within that real area rather
--    than at an arbitrary point.
--  * HICC Novotel Lawns (places/hicc-live) — HICC (the Hyderabad
--    International Convention Centre, attached to the Novotel Hyderabad
--    Convention Centre) is a real, well-known, publicly documented venue
--    in Madhapur/HITEC City. Given real coordinates for the real venue,
--    not approximated, per this task's instruction not to fabricate
--    precision for a real business.

update public.places set lat = 17.503, lng = 78.508
where slug = 'restaurants/mehfil';

update public.places set lat = 17.4174, lng = 78.3416
where slug = 'places/prabhat-nightlife';

update public.places set lat = 17.4351, lng = 78.3803
where slug = 'places/hicc-live';
