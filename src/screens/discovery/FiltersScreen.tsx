import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Switch } from '../../components/forms/Switch';
import { Tag } from '../../components/core/Tag';
import { Button } from '../../components/core/Button';
import { Tabs } from '../../components/navigation/Tabs';
import { usePersona } from '../../dev/PersonaContext';
import { saveFilters } from '../../data/searchFilters';
import {
  useSearch,
  filterSliceOf,
  vibeOptionsFor,
  KITCHEN_OPTIONS,
  CUISINE_OPTIONS,
  PLACE_TYPE_OPTIONS,
  distancePresetsFor,
  WHO_OPTIONS,
  OCCASION_OPTIONS,
  budgetCapOptionsFor,
  timeWindowOptionsFor,
  DRIVE_TIME_OPTIONS,
  type AreaType,
  type ConstraintMode,
} from '../../lib/searchState';

const AREA_TYPES: AreaType[] = ['Indoor', 'Outdoor', 'Mixed'];

const CONSTRAINT_TABS: Array<{ mode: ConstraintMode; label: string }> = [
  { mode: 'time', label: 'Time window' },
  { mode: 'drive', label: 'Drive time' },
  { mode: 'budget', label: 'Budget' },
];

// S16: side drawer on desktop, full-screen sheet on mobile (approximated here
// via Dialog's modal/sheet variants). Area type and kitchen are each
// door-specific: absent behind the wrong door, never present-but-disabled.
// "Save this set" is User only.
//
// The vibe chips, kitchen and distance presets are the design's own filter
// groups. They were missing entirely — the panel held two pet switches and
// an area type, so most of what someone told S15 and S16 never reached the
// search.
//
// Phase 6 §4: "Edit filters" on results used to open only this screen, so it
// showed S16's own answers (vibe/budget/kitchen/distance/etc.) but not S15's
// intake answers (who/occasion/hard constraint) — a person had no way back to
// those except clicking the one already-applied chip for that exact field,
// and no way in at all if that field had never been set. Who/Occasion/Hard
// constraint are now included here too, so "Edit filters" is the one place
// that surfaces and lets you change everything — S15 itself is untouched and
// still the first-time onboarding step.
//
// Phase 8 §11: that merge is also why Budget used to show up twice on this
// one screen — once as the hard-constraint's own "Budget" tab (mirroring
// S15's intake exactly, budgetCap) and again as a separate "Budget" group
// below it (S16's own price-band field, budget). Removed the second one:
// Budget is asked exactly once now, the same hard-constraint question S15
// already asks, not a second independent band filter nothing else surfaced.
//
// "Serves pet food" — deleted from both doors in Phase 8 §7, brought back
// Explore-only in Phase 9 §1 on the user's own clarification at the time,
// reversed again afterward: it belongs on Eat, not Explore — a restaurant
// or cafe can serve food for pets; a park or museum doesn't "serve"
// anything, so the Explore placement never made sense on its own terms.
//
// Phase 9 §3: Cuisine (Eat) and Place type (Explore) are new single-select
// tag groups, door-gated the same way Kitchen/Area type already are.
// "Most famous" is a switch on both doors — see buildDiscovery's own
// comment (src/data/hybridPicks.ts) for what it actually changes about
// ranking, not just the query text.
//
// Phase 9 §4: Time window's own chip set is now door-specific real
// day-part buckets (timeWindowOptionsFor) — see searchState.tsx's own
// comment for why.
//
// P12 §1: the panel was a 420px column on desktop, which put nine chip
// groups plus nine switches into a scroller barely wider than the phone
// sheet — every group wrapped onto three lines and the whole thing had to
// be scrolled twice to read once. It is a 900px modal now, with the groups
// laid out in real columns, so a desktop screen actually shows the ask.
//
// P12 §2: "Reset" clears the intake answers this panel also shows
// (who/occasion/hard constraint), not just the S16 filters — see
// searchState's resetFiltersAndIntake.
//
// P12 §6: "Save this set" was a bare <button> with no onClick at all. It
// writes the current filter set to the account now and says so.
export function FiltersScreen() {
  const { breakpoint, persona, userId } = usePersona();
  const navigate = useNavigate();
  const { search, setSearch, resetFiltersAndIntake } = useSearch();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isDesktop = breakpoint === 'desktop';
  const door = search.door;
  const {
    vibes,
    kitchen,
    cuisine,
    placeType,
    distanceKm,
    areaType,
    countryCode,
    who,
    occasion,
    constraintMode,
    timeWindow,
    driveTimePreset,
    budgetCap,
  } = search;
  const vibeOptions = vibeOptionsFor(door);
  const distancePresets = distancePresetsFor(countryCode);
  const budgetCapOptions = budgetCapOptionsFor(countryCode);
  const timeWindowOptions = timeWindowOptionsFor(door);

  const toggleVibe = (v: string) =>
    setSearch({ vibes: vibes.includes(v) ? vibes.filter((x) => x !== v) : [...vibes, v] });

  // What actually got saved, counted rather than claimed — "Saved" over an
  // empty filter set would be a confirmation of nothing.
  const activeFilterCount = Object.values(filterSliceOf(search)).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== false && v !== '',
  ).length;
  const savedSummary =
    activeFilterCount === 0
      ? 'Saved an empty set — every filter is cleared, which is a real starting point too.'
      : `Saved ${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} to your account.`;

  const saveSet = async () => {
    setSaveState('saving');
    try {
      await saveFilters(userId, filterSliceOf(search));
      setSaveState('saved');
    } catch {
      // The exact Postgres/network reason is not something anyone standing
      // in the filters panel can act on — what matters is that it did not
      // save, and that trying again is worth a shot.
      setSaveState('error');
    }
  };

  const group = (title: string, body: React.ReactNode) => (
    <div style={{ breakInside: 'avoid' }}>
      <h4 style={{ font: 'var(--type-label)', marginBottom: 'var(--space-2)' }}>{title}</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>{body}</div>
    </div>
  );

  const oneOf = (
    options: readonly string[],
    selected: string | null,
    onPick: (v: string | null) => void,
  ) =>
    options.map((o) => (
      <Tag key={o} selected={selected === o} onClick={() => onPick(selected === o ? null : o)}>
        {o}
      </Tag>
    ));

  // width 900: room for two real columns of chip groups on desktop rather
  // than one phone-width scroller. The sheet variant ignores it and stays
  // full-bleed on mobile, where one column is right.
  return (
    <>
      <Dialog
        open
        variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
        title="Filters"
        // Escape reaches both dialogs while the saved-confirmation is up
        // (each Dialog listens on document) — so with it open, closing means
        // dismissing it, not walking out of Filters entirely.
        onClose={() => (saveState === 'saved' ? setSaveState('idle') : navigate(-1))}
        width={900}
        style={isDesktop ? { maxHeight: '92vh' } : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={resetFiltersAndIntake}>
              Reset all
            </Button>
            <Button
              onClick={() => {
                setSearch({ door });
                navigate(door === 'eat' ? '/results/eat' : '/results/explore');
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
            alignItems: 'start',
            columnGap: 'var(--space-7)',
            rowGap: 'var(--space-5)',
          }}
        >
          {group(
            'Who is it for?',
            oneOf(WHO_OPTIONS, who, (v) => setSearch({ who: v })),
          )}

          {group(
            "What's the occasion?",
            oneOf(OCCASION_OPTIONS, occasion, (v) => setSearch({ occasion: v })),
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ font: 'var(--type-label)', marginBottom: 'var(--space-2)' }}>
              Your one hard constraint
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Tabs
                size="sm"
                style={{ width: 'fit-content' }}
                items={CONSTRAINT_TABS.map((tab) => ({ value: tab.mode, label: tab.label }))}
                value={constraintMode}
                onChange={(v) => setSearch({ constraintMode: v as ConstraintMode })}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {constraintMode === 'time'
                  ? oneOf(timeWindowOptions, timeWindow, (v) => setSearch({ timeWindow: v }))
                  : null}
                {constraintMode === 'drive'
                  ? oneOf(DRIVE_TIME_OPTIONS, driveTimePreset, (v) =>
                      setSearch({ driveTimePreset: v }),
                    )
                  : null}
                {constraintMode === 'budget'
                  ? oneOf(budgetCapOptions, budgetCap, (v) => setSearch({ budgetCap: v }))
                  : null}
              </div>
            </div>
          </div>

          {group(
            'Vibe',
            vibeOptions.map((v) => (
              <Tag key={v} selected={vibes.includes(v)} onClick={() => toggleVibe(v)}>
                {v}
              </Tag>
            )),
          )}

          {door === 'eat'
            ? group(
                'Kitchen',
                oneOf(KITCHEN_OPTIONS, kitchen, (v) => setSearch({ kitchen: v })),
              )
            : null}

          {door === 'eat'
            ? group(
                'Cuisine',
                oneOf(CUISINE_OPTIONS, cuisine, (v) => setSearch({ cuisine: v })),
              )
            : null}

          {group(
            'Distance (optional)',
            // Its own field (distanceKm), independent of S15's hard-constraint
            // toggle — the two used to share one field, so picking a distance
            // here silently overwrote whatever S15 had set. Presets are
            // locale-aware (km or miles) but distanceKm itself always stores
            // real kilometres — the one unit the actual radius math works in.
            //
            // P12 §3: distance is not a required answer and never was — the
            // search runs perfectly well with no preference at all. So each
            // preset toggles: tapping the one already chosen clears it, the
            // same way every single-select chip group on this panel behaves
            // (see `oneOf`).
            //
            // P13 §1: "Any distance" used to stay fully unhighlighted even
            // though it is the group's real, currently-active answer — next
            // to every other filled-teal chosen chip on this panel, an
            // unstyled grey pill reads as *disabled*, not as "this one is
            // already picked, tap another to change it." It is a real,
            // clickable choice at every moment (tapping it again is a
            // harmless no-op when it's already active), so it gets a soft
            // `tone="outline"` highlight — visibly active and interactive,
            // without the strong teal fill Filters' own preset chips use,
            // which would read as a hard requirement (the actual bug this
            // group used to have, before it could be deselected at all).
            distancePresets.map((p) => {
              const isAny = p.km === null;
              const active = isAny ? distanceKm === '' : distanceKm === p.km;
              return (
                <Tag
                  key={p.label}
                  selected={active}
                  tone={isAny ? 'outline' : 'solid'}
                  onClick={() =>
                    setSearch({ distanceKm: p.km !== null && distanceKm !== p.km ? p.km : '' })
                  }
                >
                  {p.label}
                </Tag>
              );
            }),
          )}

          {door === 'explore'
            ? group(
                'Area type',
                AREA_TYPES.map((t) => (
                  <Tag
                    key={t}
                    selected={areaType === t}
                    onClick={() => setSearch({ areaType: areaType === t ? null : t })}
                  >
                    {t}
                  </Tag>
                )),
              )
            : null}

          {door === 'explore'
            ? group(
                'Place type',
                oneOf(PLACE_TYPE_OPTIONS, placeType, (v) => setSearch({ placeType: v })),
              )
            : null}

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              columnGap: 'var(--space-7)',
              rowGap: 'var(--space-4)',
            }}
          >
            <Switch
              label="Most famous"
              checked={search.mostFamous}
              onChange={(v) => setSearch({ mostFamous: v })}
            />
            <Switch
              label="Open now"
              checked={search.openNow}
              onChange={(v) => setSearch({ openNow: v })}
            />
            <Switch
              label="Open late"
              checked={search.openLate}
              onChange={(v) => setSearch({ openLate: v })}
            />
            <Switch
              label="Allows pets"
              checked={search.allowsPets}
              onChange={(v) => setSearch({ allowsPets: v })}
            />
            {door === 'eat' ? (
              <Switch
                label="Serves pet food"
                checked={search.servesPetFood}
                onChange={(v) => setSearch({ servesPetFood: v })}
              />
            ) : null}
            <Switch
              label="Family friendly"
              checked={search.familyFriendly}
              onChange={(v) => setSearch({ familyFriendly: v })}
            />
            <Switch
              label="Couple friendly"
              checked={search.coupleFriendly}
              onChange={(v) => setSearch({ coupleFriendly: v })}
            />
            <Switch
              label={door === 'eat' ? 'Skip long waits' : 'Avoid crowded times'}
              checked={search.waitCare}
              onChange={(v) => setSearch({ waitCare: v })}
            />
          </div>

          {persona !== 'guest' ? (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                disabled={saveState === 'saving'}
                onClick={() => void saveSet()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-link)',
                  cursor: saveState === 'saving' ? 'progress' : 'pointer',
                  textAlign: 'left',
                  padding: 0,
                  font: 'var(--type-label)',
                }}
              >
                {saveState === 'saving' ? 'Saving this set…' : 'Save this set'}
              </button>
              {saveState === 'error' ? (
                <span style={{ font: 'var(--type-caption)', color: 'var(--status-warn-fg)' }}>
                  Could not save that set. Try again in a moment.
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Dialog>

      {saveState === 'saved' ? (
        <Dialog
          open
          variant={isDesktop ? 'modal' : 'sheet'}
          title="Filter set saved"
          onClose={() => setSaveState('idle')}
          width={360}
          footer={<Button onClick={() => setSaveState('idle')}>Back to filters</Button>}
        >
          <p style={{ font: 'var(--type-body)', margin: 0 }}>{savedSummary}</p>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
            It comes back the next time you open Madli on this account.
          </p>
        </Dialog>
      ) : null}
    </>
  );
}
