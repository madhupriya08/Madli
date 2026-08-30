/**
 * Outing stops added from the bridge screen ("Places to explore nearby").
 * Local until plans support Google place ids in the Madli catalogue FK.
 */

export interface OutingStop {
  placeId: string;
  name: string;
  address: string;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  addedAt: number;
}

export interface OutingPlan {
  anchorPlaceId: string;
  anchorName: string;
  anchorLat?: number;
  anchorLng?: number;
  stops: OutingStop[];
}

const STORAGE_KEY = 'madli.outingPlans';

function readAll(): OutingPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutingPlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(plans: OutingPlan[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // best-effort
  }
}

export function listOutingPlans(): OutingPlan[] {
  return readAll().filter((p) => p.stops.length > 0);
}

export function getOuting(anchorPlaceId: string): OutingPlan | undefined {
  return readAll().find((p) => p.anchorPlaceId === anchorPlaceId);
}

export function addOutingStop(
  anchorPlaceId: string,
  anchorName: string,
  stop: Omit<OutingStop, 'addedAt'>,
  anchorLocation?: { lat: number; lng: number },
): OutingPlan {
  const all = readAll();
  let plan = all.find((p) => p.anchorPlaceId === anchorPlaceId);
  if (!plan) {
    plan = { anchorPlaceId, anchorName, stops: [] };
    all.unshift(plan);
  }
  plan.anchorName = anchorName;
  if (anchorLocation) {
    plan.anchorLat = anchorLocation.lat;
    plan.anchorLng = anchorLocation.lng;
  }
  plan.stops = plan.stops.filter((s) => s.placeId !== stop.placeId);
  plan.stops.push({ ...stop, addedAt: Date.now() });
  writeAll(all);
  return plan;
}

export function isStopInOuting(anchorPlaceId: string, placeId: string): boolean {
  return getOuting(anchorPlaceId)?.stops.some((s) => s.placeId === placeId) ?? false;
}

/**
 * Phase 8 §3: removes one stop; if it was the last one, the whole outing
 * goes with it — same shape as the real, signed-in-User plan's
 * fn_remove_plan_item. Returns true when the outing itself was removed.
 */
export function removeOutingStop(anchorPlaceId: string, placeId: string): boolean {
  const all = readAll();
  const plan = all.find((p) => p.anchorPlaceId === anchorPlaceId);
  if (!plan) return false;
  plan.stops = plan.stops.filter((s) => s.placeId !== placeId);
  if (plan.stops.length === 0) {
    writeAll(all.filter((p) => p.anchorPlaceId !== anchorPlaceId));
    return true;
  }
  writeAll(all);
  return false;
}

export function removeOutingPlan(anchorPlaceId: string): void {
  writeAll(readAll().filter((p) => p.anchorPlaceId !== anchorPlaceId));
}
