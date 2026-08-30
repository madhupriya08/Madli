import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Switch } from '../../components/forms/Switch';
import { Tag } from '../../components/core/Tag';
import { Button } from '../../components/core/Button';
import { Tabs } from '../../components/navigation/Tabs';
import { usePersona } from '../../dev/PersonaContext';
import {
  useSearch,
  vibeOptionsFor,
  KITCHEN_OPTIONS,
  distancePresetsFor,
  WHO_OPTIONS,
  OCCASION_OPTIONS,
  budgetCapOptionsFor,
  TIME_WINDOW_OPTIONS,
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
export function FiltersScreen() {
  const { breakpoint, persona } = usePersona();
  const navigate = useNavigate();
  const { search, setSearch, resetFilters } = useSearch();
  const door = search.door;
  const {
    vibes,
    kitchen,
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

  const toggleVibe = (v: string) =>
    setSearch({ vibes: vibes.includes(v) ? vibes.filter((x) => x !== v) : [...vibes, v] });

  const group = (title: string, body: React.ReactNode) => (
    <div>
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

  return (
    <Dialog
      open
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
      title="Filters"
      onClose={() => navigate(-1)}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={resetFilters}>
            Reset
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {group(
          'Who is it for?',
          oneOf(WHO_OPTIONS, who, (v) => setSearch({ who: v })),
        )}

        {group(
          "What's the occasion?",
          oneOf(OCCASION_OPTIONS, occasion, (v) => setSearch({ occasion: v })),
        )}

        <div>
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
                ? oneOf(TIME_WINDOW_OPTIONS, timeWindow, (v) => setSearch({ timeWindow: v }))
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

        {group(
          'Distance',
          // Its own field (distanceKm), independent of S15's hard-constraint
          // toggle — the two used to share one field, so picking a distance
          // here silently overwrote whatever S15 had set. Presets are
          // locale-aware (km or miles) but distanceKm itself always stores
          // real kilometres — the one unit the actual radius math works in.
          distancePresets.map((p) => (
            <Tag
              key={p.label}
              selected={p.km === null ? distanceKm === '' : distanceKm === p.km}
              onClick={() => setSearch({ distanceKm: p.km ?? '' })}
            >
              {p.label}
            </Tag>
          )),
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Save this set
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}
