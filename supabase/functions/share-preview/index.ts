// Phase 1 §9: Share preview Edge Function.
//
// Decision record: the design handoff's CLAUDE.md resolves the Next.js-vs-Vite
// conflict flagged in the backend prompt's §4 — since this repository was
// greenfield, CLAUDE.md's instruction applies: "React + TypeScript + Vite...
// no Tailwind, no component library". A plain Vite SPA has no server-side
// rendering, so it cannot generate per-page Open Graph meta tags the way a
// framework with a metadata API (e.g. Next.js) can. S22's requirement — a
// recipient preview that unfurls correctly in WhatsApp/social before the link
// is even opened — needs real HTML meta tags in the initial response, which a
// client-rendered SPA cannot provide. That makes this a genuine Edge Function
// case, not redundant CRUD: it renders HTML for crawlers, not JSON, and needs
// no authentication (shared links open fully, per rule 3 — no account, no cap,
// never expire).
//
// verify_jwt is disabled for this function (see deploy call) because the
// people/crawlers hitting it are anonymous by design (WhatsApp link unfurlers
// have no Supabase session). This does not weaken data protection: the
// function only ever reads through the anon key, so Postgres RLS (public
// SELECT on places; the share_token-header-scoped policy on plans) is still
// the real gate — a wrong or missing share token yields zero rows here just
// as it would for any other anon client.

import { z } from 'npm:zod@3.23.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
// Set once the Phase 2/3 frontend has a real deployed URL. Falls back to a
// clearly-labeled placeholder so this function is still testable before then.
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.madli.example';

const querySchema = z.object({
  type: z.enum(['place', 'plan']),
  slug: z.string().min(1).max(200).optional(),
  token: z.string().min(1).max(200).optional(),
}).refine((v) => (v.type === 'place' ? !!v.slug : !!v.token), {
  message: 'type=place requires slug; type=plan requires token',
});

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPreview(opts: { title: string; description: string; canonicalUrl: string }) {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description.slice(0, 200));
  const url = escapeHtml(opts.canonicalUrl);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta http-equiv="refresh" content="0; url=${url}">
<link rel="canonical" href="${url}">
</head>
<body>
<p>No account needed, never expires. Redirecting to <a href="${url}">${url}</a>&hellip;</p>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function notFound(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    type: url.searchParams.get('type') ?? undefined,
    slug: url.searchParams.get('slug') ?? undefined,
    token: url.searchParams.get('token') ?? undefined,
  });

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { type, slug, token } = parsed.data;

  if (type === 'place') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/places?select=name,reason,slug&slug=eq.${encodeURIComponent(slug!)}&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    const rows = await res.json();
    const place = rows?.[0];
    if (!place) return notFound('place not found');

    return renderPreview({
      title: `${place.name} · Madli`,
      description: place.reason,
      canonicalUrl: `${APP_URL}/places/${place.slug}`,
    });
  }

  // type === 'plan'
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/plans?select=name,share_token,eat_place:eat_place_id(name,reason),explore_place:explore_place_id(name,reason)&share_token=eq.${encodeURIComponent(token!)}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-share-token': token!,
      },
    },
  );
  const rows = await res.json();
  const plan = rows?.[0];
  if (!plan) return notFound('plan not found or token invalid');

  const eatName = plan.eat_place?.name ?? 'a place to eat';
  const exploreName = plan.explore_place?.name ?? 'somewhere to go';

  return renderPreview({
    title: plan.name ? `${plan.name} · a Madli plan` : `${eatName} + ${exploreName} · a Madli plan`,
    description: `${eatName}, then ${exploreName}. 3 picks, 1 reason, 2 minutes.`,
    canonicalUrl: `${APP_URL}/plans/${token}`,
  });
});
