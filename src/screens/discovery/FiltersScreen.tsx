import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Switch } from '../../components/forms/Switch';
import { Tag } from '../../components/core/Tag';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import {
  useSearch,
  vibeOptionsFor,
  budgetOptionsFor,
  KITCHEN_OPTIONS,
  distancePresetsFor,
  type AreaType,
} from '../../lib/searchState';

const AREA_TYPES: AreaType[] = ['Indoor', 'Outdoor', 'Mixed'];

// S16: side drawer on desktop, full-screen sheet on mobile (approximated here
// via Dialog's modal/sheet variants). Pets is deliberately two separate
// switches — allows pets and serves pet food are different questions. Area
// type and kitchen are each door-specific: absent behind the wrong door,
// never present-but-disabled. "Save this set" is User only.
//
// The vibe chips, budget band, kitchen and distance presets are the design's
// own filter groups. They were missing entirely — the panel held two pet
// switches and an area type, so most of what someone told S15 and S16 never
// reached the search.
export function FiltersScreen() {
  const { breakpoint, persona } = usePersona();
  const navigate = useNavigate();
  const { search, setSearch, resetFilters } = useSearch();
  const door = search.door;
  const { vibes, budget, kitchen, distanceKm, areaType, countryCode } = search;
  const vibeOptions = vibeOptionsFor(door);
  const budgetOptions = budgetOptionsFor(countryCode);
  const distancePresets = distancePresetsFor(countryCode);

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
          'Vibe',
          vibeOptions.map((v) => (
            <Tag key={v} selected={vibes.includes(v)} onClick={() => toggleVibe(v)}>
              {v}
            </Tag>
          )),
        )}

        {group(
          'Budget',
          oneOf(budgetOptions, budget, (v) => setSearch({ budget: v })),
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
            label="Serves pet food"
            checked={search.servesPetFood}
            onChange={(v) => setSearch({ servesPetFood: v })}
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
