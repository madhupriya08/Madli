// P14: "does this place have any history worth telling" — the AI-generated
// fallback half of PlaceDetailScreen's history section. Google's own
// editorial summary (fetched client-side, see src/lib/placesSearch.ts) is
// tried first and is real, verifiable data; this function only runs when
// that comes back empty, and it is honest about what it is: model output,
// not a fact-checked claim, labeled as such in the UI (see PlaceDetailScreen's
// "AI-generated, unverified" caption on this section).
//
// Same reasoning as share-preview/index.ts for why this is a genuine Edge
// Function rather than a client-side call: the API key it needs must never
// reach the browser bundle. verify_jwt is disabled (see deploy call) —
// anyone viewing a place page, Guest included, benefits from this, and the
// function touches no per-user data.
//
// Caches into place_history_cache with the service-role key (bypasses RLS
// by design — see that migration's own comment) so the model is called once
// per place, ever, not once per view. Read-back uses the anon key, since
// the cache table's own RLS already allows public SELECT.
//
// Inert without ANTHROPIC_API_KEY set as a function secret: returns
// { history: null } rather than erroring, so a place page never breaks or
// blocks on this being unconfigured.

import { z } from 'npm:zod@3.23.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// Cheap and fast on purpose: this is 1-2 sentences of flavor text, not a
// research task. See PHASE_14 planning notes for why Claude over another
// provider — this is already a Claude Code project, and there's no per-call
// cost advantage to picking anything else for a job this small.
const MODEL = 'claude-haiku-4-5-20251001';

const querySchema = z.object({
  googlePlaceId: z.string().min(1).max(300),
  name: z.string().min(1).max(200),
  types: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
  areaText: z.string().max(200).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readCache(googlePlaceId: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/place_history_cache?select=history&google_place_id=eq.${encodeURIComponent(googlePlaceId)}&limit=1`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.history ?? null;
}

async function writeCache(googlePlaceId: string, history: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/place_history_cache`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ google_place_id: googlePlaceId, history, model: MODEL }),
  });
}

const NO_HISTORY_TOKEN = 'NONE';

async function generateHistory(input: {
  name: string;
  types?: string;
  address?: string;
  areaText?: string;
}): Promise<string | null> {
  const context = [
    `Name: ${input.name}`,
    input.types ? `Type: ${input.types}` : null,
    input.address ? `Address: ${input.address}` : null,
    input.areaText ? `Area: ${input.areaText}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `You are writing a single short "history & trivia" line for a place page in a local-discovery app. Here is what is known about the place:

${context}

If you have genuine, reasonably confident knowledge of something historically or culturally notable about this specific place (e.g. how old it is, a notable first, a well-known past use of the building or site) — write exactly one or two sentences stating it plainly, no hedging language like "reportedly" or "it is said that". If you do not have specific, confident knowledge about this exact place, respond with exactly the single word ${NO_HISTORY_TOKEN} and nothing else. Never invent a specific date, name, or claim you are not confident about — a missing history line is far better than a wrong one.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
    .trim();

  if (!text || text === NO_HISTORY_TOKEN) return null;
  return text;
}

Deno.serve(async (req: Request) => {
  // POST + JSON body, called via the client's supabase.functions.invoke —
  // unlike share-preview, nothing external (crawlers, unfurlers) hits this
  // one directly, so there's no reason to make it a GET/query-string API.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const parsed = querySchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: parsed.error.flatten() }, 400);
  }
  const { googlePlaceId, name, types, address, areaText } = parsed.data;

  const cached = await readCache(googlePlaceId);
  if (cached) return json({ history: cached, cached: true });

  if (!ANTHROPIC_API_KEY) {
    // Not configured yet — a normal, expected state, not an error.
    return json({ history: null, cached: false });
  }

  const history = await generateHistory({ name, types, address, areaText });
  if (!history) return json({ history: null, cached: false });

  await writeCache(googlePlaceId, history);
  return json({ history, cached: false });
});
