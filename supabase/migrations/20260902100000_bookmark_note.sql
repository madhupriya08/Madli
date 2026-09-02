-- ---------------------------------------------------------------------------
-- P11 §"saved/bookmark page" — an optional freeform "why I saved this" note
-- per bookmark, from the Bookmarks screen's own design spec (S23). No new
-- RLS needed: bookmarks_owner_all is already `for all`, so the existing
-- owner-only policy already covers updating this column.
-- ---------------------------------------------------------------------------

alter table public.bookmarks add column note text;
