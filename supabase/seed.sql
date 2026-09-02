-- Phase 1 §16: seed data lifted verbatim from the design handoff's prototype
-- (design_handoff_madli/prototype/Madli Prototype.dc.html, the FOOD/EXPLORE/
-- AREAS arrays around lines 2972-3005) — 8 eat places, 8 explore places, 8
-- neighbourhoods, matching the handoff's own description of the seed set.
--
-- Fixed UUIDs are used (not gen_random_uuid()) so this file is idempotent and
-- so cross-references between places / place_eat_details / place_explore_details
-- are readable. Run via `supabase db reset` locally, or applied once against
-- the hosted dev project (see supabase/README.md).

begin;

-- ---------------------------------------------------------------------------
-- Categories (7 seeded comparison buckets, README §3 / CLAUDE.md)
-- ---------------------------------------------------------------------------

insert into public.categories (id, name) values
  ('00000000-0000-0000-0000-0000000000c1', 'Breakfast and tiffin'),
  ('00000000-0000-0000-0000-0000000000c2', 'Biryani and kebab'),
  ('00000000-0000-0000-0000-0000000000c3', 'Cafes'),
  ('00000000-0000-0000-0000-0000000000c4', 'Lakes and viewpoints'),
  ('00000000-0000-0000-0000-0000000000c5', 'Historical'),
  ('00000000-0000-0000-0000-0000000000c6', 'Nightlife'),
  ('00000000-0000-0000-0000-0000000000c7', 'Concerts and events')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Areas (8 neighbourhoods, AREAS array). Alwal is deliberately below ranking
-- threshold in the handoff's own design intent.
-- ---------------------------------------------------------------------------

insert into public.areas (id, name, coverage_depth_label) values
  ('00000000-0000-0000-0000-0000000000a1', 'Jubilee Hills', '418 places · deep coverage'),
  ('00000000-0000-0000-0000-0000000000a2', 'Banjara Hills', '362 places · deep coverage'),
  ('00000000-0000-0000-0000-0000000000a3', 'Old City', '284 places · deep coverage'),
  ('00000000-0000-0000-0000-0000000000a4', 'Madhapur', '251 places · deep coverage'),
  ('00000000-0000-0000-0000-0000000000a5', 'Secunderabad', '203 places · good coverage'),
  ('00000000-0000-0000-0000-0000000000a6', 'Kondapur', '166 places · good coverage'),
  ('00000000-0000-0000-0000-0000000000a7', 'Nampally', '94 places · thin coverage'),
  ('00000000-0000-0000-0000-0000000000a8', 'Alwal', '31 places · not enough to rank')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Eat places (FOOD array, f1-f8)
-- ---------------------------------------------------------------------------

insert into public.places (
  id, slug, name, type, vibe, category_id, neighborhood, area_id, price_level,
  reason, history, tags, gap_tone, gap_points, locals, visitors, drive, address, phone, hours
) values
  ('00000000-0000-0000-0000-0000000000f1', 'restaurants/hotel-shadab', 'Hotel Shadab', 'eat', 'Diner',
   '00000000-0000-0000-0000-0000000000c2', 'Ghansi Bazaar', null, '₹300 / head',
   'Locals rank it first for a late Ramzan-hours plate: the kitchen runs past 2am and the haleem is made in the same three vessels it always was.',
   'Opened in 1965 as a single counter selling haleem to mill workers on night shift. The same family still runs the kitchen.',
   array['Friends','Late night','Family'], 'clear', 14, 412, 88, '22 min · 9.4 km',
   'Ghansi Bazaar, near Madina Circle', '040 2456 1180', '12pm – 2am'),

  ('00000000-0000-0000-0000-0000000000f2', 'restaurants/nimrah-cafe-bakery', 'Nimrah Cafe & Bakery', 'eat', 'Tiffin',
   '00000000-0000-0000-0000-0000000000c3', 'Old City', '00000000-0000-0000-0000-0000000000a3', '₹75 / head',
   'Seventy-five rupees for chai and Osmania biscuits, and 84% of the people ranking it live inside two kilometres of Charminar.',
   'A tea counter since the 1950s that grew into a bakery once the Charminar crowds discovered the biscuits.',
   array['Solo','Friends','Breakfast'], 'close', 3, 318, 41, '24 min · 10.2 km',
   'Opposite Charminar, Old City', '040 2452 3391', '5am – 11pm'),

  ('00000000-0000-0000-0000-0000000000f3', 'restaurants/roastery-coffee-house', 'Roastery Coffee House', 'eat', 'Calm and pleasant',
   '00000000-0000-0000-0000-0000000000c3', 'Banjara Hills', '00000000-0000-0000-0000-0000000000a2', '₹450 / head',
   'The only kitchen on Road No. 12 still cooking to order after midnight, and the filter batch is ground every two hours.',
   'Started as a roastery counter for a single Banjara Hills office block before opening seating in 2019.',
   array['Couple','Late night','Work lunch'], 'clear', 9, 204, 96, '11 min · 4.8 km',
   'Road No. 12, Banjara Hills', '040 2355 4477', '8am – 1am'),

  ('00000000-0000-0000-0000-0000000000f4', 'restaurants/chutneys', 'Chutneys', 'eat', 'Tiffin',
   '00000000-0000-0000-0000-0000000000c1', 'Banjara Hills', '00000000-0000-0000-0000-0000000000a2', '₹350 / head',
   'Six chutneys with every order, refilled without asking, and they stop serving breakfast the moment the batter runs out.',
   'Grew from one Banjara Hills tiffin room into a small local chain without ever changing the chutney list.',
   array['Family','Parents','Breakfast'], 'clear', 7, 289, 133, '9 min · 3.7 km',
   'Road No. 3, Banjara Hills', '040 2335 1180', '7am – 11pm'),

  ('00000000-0000-0000-0000-0000000000f5', 'restaurants/cafe-bahar', 'Cafe Bahar', 'eat', 'Date night',
   '00000000-0000-0000-0000-0000000000c2', 'Basheerbagh', null, '₹400 / head',
   'Charcoal, not gas, and the boneless biryani has not changed price in three years.',
   'Opened in 1981 next to the old cinema, and the charcoal ovens have never been swapped for gas.',
   array['Celebration','Friends'], 'thin', 2, 61, 112, '16 min · 6.8 km',
   'Bashir Bagh Road, Basheerbagh', '040 2320 4747', '11am – 12am'),

  ('00000000-0000-0000-0000-0000000000f6', 'restaurants/subhan-bakery', 'Subhan Bakery', 'eat', 'Food truck / stall',
   '00000000-0000-0000-0000-0000000000c3', 'Nampally', '00000000-0000-0000-0000-0000000000a7', '₹100 / head',
   'Ranked 4th in the city for Osmania biscuits by people who live here, and 214th by everyone else. Open since 1948.',
   'Founded in 1948 near Nampally station; three generations of the same family have run the ovens since.',
   array['Solo','Friends'], 'clear', 21, 507, 19, '27 min · 12.6 km',
   'Nampally Station Road', '040 2461 5566', '6am – 10pm'),

  ('00000000-0000-0000-0000-0000000000f7', 'restaurants/rayalaseema-ruchulu', 'Rayalaseema Ruchulu', 'eat', 'Diner',
   '00000000-0000-0000-0000-0000000000c2', 'Jubilee Hills', '00000000-0000-0000-0000-0000000000a1', '₹600 / head',
   'Andhra heat without the apology — the natu kodi is cooked to order and takes forty minutes.',
   'Opened to bring unfiltered Rayalaseema heat to Jubilee Hills, where most menus had been toned down.',
   array['Celebration','Family'], 'clear', 6, 233, 141, '7 min · 2.9 km',
   'Road No. 45, Jubilee Hills', '040 2354 9090', '12pm – 11pm'),

  ('00000000-0000-0000-0000-0000000000f8', 'restaurants/simply-south', 'Simply South', 'eat', 'Michelin-style',
   '00000000-0000-0000-0000-0000000000c1', 'Filmnagar', null, '₹750 / head',
   'Chettinad, Coorg and Kerala on one menu, and the appam batter is fermented on site overnight.',
   'Started as a weekend pop-up serving three regional South Indian cuisines before opening as a full restaurant.',
   array['Couple','Work lunch'], 'close', 4, 178, 204, '13 min · 5.4 km',
   'Road No. 2, Filmnagar', '040 2354 1717', '12pm – 11pm')
on conflict (id) do nothing;

insert into public.place_eat_details (place_id, wait_time, serving_hours, dishes, gem) values
  ('00000000-0000-0000-0000-0000000000f1', '20–35 min after 9pm, walk-in before 7pm', 'Kitchen is fastest 12–3pm; slows after 9pm when the queue forms', 18, false),
  ('00000000-0000-0000-0000-0000000000f2', 'Under 10 min most hours, longer on weekend mornings', 'Biscuits are freshest right after the 6am and 4pm bakes', 12, false),
  ('00000000-0000-0000-0000-0000000000f3', 'Rarely a wait; tables free up fast after 9pm', 'Kitchen slows for a lull 3–6pm, back to full speed by 7pm', 9, false),
  ('00000000-0000-0000-0000-0000000000f4', '15–25 min on weekend mornings, no wait on weekdays', 'Breakfast batter usually runs out by 10:30am on weekends', 14, false),
  ('00000000-0000-0000-0000-0000000000f5', '30–40 min on Friday and Saturday nights', 'Biryani batches come out on the hour from 12pm to 11pm', 11, false),
  ('00000000-0000-0000-0000-0000000000f6', 'Under 5 min, it is a walk-up counter', 'Two bakes a day, 6am and 3pm — biscuits sell out within two hours each time', 4, true),
  ('00000000-0000-0000-0000-0000000000f7', 'Natu kodi is cooked to order — budget 40 min from ordering to plate', 'Order the natu kodi before 8:30pm if you want it before closing', 16, false),
  ('00000000-0000-0000-0000-0000000000f8', '10–20 min at lunch, walk-in most evenings', 'Appam batter is fermented overnight, so it is freshest before 10am and after 6pm', 13, false)
on conflict (place_id) do nothing;

-- ---------------------------------------------------------------------------
-- Explore places (EXPLORE array, e1-e8). Note: the source material's EXPLORE
-- array carries no locals/visitors/gapTone/gapPoints/drive values for any of
-- these rows except Charminar, whose locals=47 comes from the prototype's
-- separate admin catalogue mock (CAT_ROWS) — used here because it is real
-- source data, not invented, and conveniently gives us an Explore-side
-- below-threshold example. The other seven intentionally carry no ranking
-- signal (locals=0) rather than an invented number; see supabase/README.md
-- for what this means for demoing the Explore door.
-- ---------------------------------------------------------------------------

insert into public.places (
  id, slug, name, type, vibe, category_id, neighborhood, area_id, price_level,
  reason, history, tags, gap_tone, gap_points, locals, visitors, drive, address, phone, hours
) values
  ('00000000-0000-0000-0000-0000000000e1', 'places/durgam-cheruvu', 'Durgam Cheruvu', 'explore', 'Sightseeing',
   '00000000-0000-0000-0000-0000000000c4', 'Madhapur', '00000000-0000-0000-0000-0000000000a4', 'Free entry',
   'Three kilometres of shaded path around the water, and the west bank is empty until about 8am.',
   'A natural lake bridged in 2019 by the glass cable bridge, which turned a quiet lake edge into a walking route.',
   '{}', null, null, 0, 0, null, 'Madhapur, near the cable bridge', '—', '5:30am – 8pm'),

  ('00000000-0000-0000-0000-0000000000e2', 'places/qutb-shahi-tombs', 'Qutb Shahi Tombs', 'explore', 'Historical',
   '00000000-0000-0000-0000-0000000000c5', 'Ibrahim Bagh', null, '₹50 entry',
   'Thirty domes across a walkable site, and the last ticket goes at 4:30pm sharp.',
   'The necropolis of the Qutb Shahi dynasty, built between the 16th and 17th centuries beside Golconda Fort.',
   '{}', null, null, 0, 0, null, 'Ibrahim Bagh, near Golconda', '040 2351 3355', '9:30am – 5pm'),

  ('00000000-0000-0000-0000-0000000000e3', 'places/ananthagiri-hills', 'Ananthagiri Hills', 'explore', 'Sightseeing',
   '00000000-0000-0000-0000-0000000000c4', '92 km out', null, 'Free entry',
   'Ninety-two kilometres out and most of it is forest — the fog sits in the valley until about ten.',
   'A reserve forest and coffee-growing hill range that has stayed undeveloped despite being under two hours from the city.',
   '{}', null, null, 0, 0, null, 'Vikarabad district', '—', 'Open all day'),

  ('00000000-0000-0000-0000-0000000000e4', 'places/golconda-fort', 'Golconda Fort', 'explore', 'Historical',
   '00000000-0000-0000-0000-0000000000c5', 'Golconda', null, '₹25 entry',
   'A clap at the entrance is heard at the summit, 380 steps up. Go at 4pm and the climb is in shade.',
   'A 13th-century fort that became the seat of the Qutb Shahi kingdom and the source of the Koh-i-Noor diamond''s cutting.',
   '{}', null, null, 0, 0, null, 'Ibrahim Bagh, Golconda', '040 2351 3984', '9am – 5:30pm'),

  ('00000000-0000-0000-0000-0000000000e5', 'places/charminar', 'Charminar', 'explore', 'Historical',
   '00000000-0000-0000-0000-0000000000c5', 'Old City', '00000000-0000-0000-0000-0000000000a3', '₹25 entry',
   'Four hundred and thirty years old, and the bangle lanes behind it are the actual reason to come.',
   'Built in 1591 to mark the founding of Hyderabad, at the centre of four historic roads that still meet there.',
   '{}', 'thin', null, 47, 0, null, 'Char Kaman, Old City', '040 2452 0591', '9:30am – 5:30pm'),

  ('00000000-0000-0000-0000-0000000000e6', 'places/kbr-national-park', 'KBR National Park', 'explore', 'Sightseeing',
   '00000000-0000-0000-0000-0000000000c4', 'Jubilee Hills', '00000000-0000-0000-0000-0000000000a1', '₹25 entry',
   'Six kilometres of trail inside the city, and peacocks on the inner loop most mornings before seven.',
   'Once part of the Nizam''s private hunting grounds, fenced off as a protected park in 1998.',
   '{}', null, null, 0, 0, null, 'Road No. 2, Jubilee Hills', '—', '5:30am – 10am, 4pm – 7pm'),

  ('00000000-0000-0000-0000-0000000000e7', 'places/prabhat-nightlife', 'AutoLounge Rooftop', 'explore', 'Nightlife / clubs',
   '00000000-0000-0000-0000-0000000000c6', 'Gachibowli', null, '₹1,200 / head',
   'The only rooftop in Gachibowli that keeps the sound system below a level where you can still order a drink by talking.',
   'Opened in 2021 in a converted terrace above a co-working building, aimed at the tech-park crowd nearby.',
   '{}', null, null, 0, 0, null, 'Financial District, Gachibowli', '040 4012 8890', '6pm – 1am'),

  ('00000000-0000-0000-0000-0000000000e8', 'places/hicc-live', 'HICC Novotel Lawns', 'explore', 'Concerts',
   '00000000-0000-0000-0000-0000000000c7', 'Madhapur', '00000000-0000-0000-0000-0000000000a4', 'Varies by show',
   'The lawn holds the city''s biggest touring acts, and the back third has the clearest sightline to the stage.',
   'Built as a convention-centre lawn in 2005, it has hosted the city''s largest ticketed concerts since.',
   '{}', null, null, 0, 0, null, 'HITEC City, Madhapur', '040 4919 1919', 'Event dependent')
on conflict (id) do nothing;

insert into public.place_explore_details (place_id, crowd_level, best) values
  ('00000000-0000-0000-0000-0000000000e1', 'Quiet before 8am, busy 5–7pm on weekends', '6am to 8:30am'),
  ('00000000-0000-0000-0000-0000000000e2', 'Rarely crowded; busiest with tour groups 10am–12pm', '3pm to 5pm'),
  ('00000000-0000-0000-0000-0000000000e3', 'Empty on weekdays; day-trip crowds on Sunday mornings', 'Sunrise'),
  ('00000000-0000-0000-0000-0000000000e4', 'Peak crowds 4–6pm for the sound-and-light show; quiet mid-morning', '4pm to sunset'),
  ('00000000-0000-0000-0000-0000000000e5', 'Always busy; the bangle lanes peak in the evening', 'Late afternoon'),
  ('00000000-0000-0000-0000-0000000000e6', 'Quiet on the inner loop before 7am, busiest with joggers 6–8am', 'Before 7am'),
  ('00000000-0000-0000-0000-0000000000e7', 'Fills up after 10pm on Friday and Saturday; easy entry on weekdays', '9pm to midnight'),
  ('00000000-0000-0000-0000-0000000000e8', 'Packed for major shows; check the specific event for entry times', 'Gates usually open 2 hours before showtime')
on conflict (place_id) do nothing;

-- ---------------------------------------------------------------------------
-- §16 explicit requirement: at least one place below the ~50-rating threshold,
-- mirroring the handoff's Alwal intent. "Mehfil" is named (Alwal, Biryani and
-- kebab, 9 ratings, status "Thin") in the prototype's admin catalogue mock
-- (CAT_ROWS) — locals=9, neighborhood, and category are real handoff data;
-- reason/address/phone/hours below are synthesized fixture placeholders since
-- the source only gives the catalogue-row summary, not a full Place record.
-- ---------------------------------------------------------------------------

insert into public.places (
  id, slug, name, type, vibe, category_id, neighborhood, area_id, price_level,
  reason, history, tags, gap_tone, gap_points, locals, visitors, drive, address, phone, hours
) values (
  '00000000-0000-0000-0000-0000000000f9', 'restaurants/mehfil', 'Mehfil', 'eat', 'Diner',
  '00000000-0000-0000-0000-0000000000c2', 'Alwal', '00000000-0000-0000-0000-0000000000a8', '₹350 / head',
  '[fixture placeholder — source gives only the catalogue-row summary] A neighbourhood biryani spot in Alwal, seeded specifically to exercise the below-threshold "not enough evidence" path.',
  null, array['Family'], 'thin', null, 9, 3, '38 min · 19.1 km',
  '[fixture placeholder address], Alwal', '[fixture placeholder phone]', '12pm – 11pm'
) on conflict (id) do nothing;

insert into public.place_eat_details (place_id, wait_time, serving_hours, dishes, gem) values
  ('00000000-0000-0000-0000-0000000000f9', null, null, 6, false)
on conflict (place_id) do nothing;

commit;
