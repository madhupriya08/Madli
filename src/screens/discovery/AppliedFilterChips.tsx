import { useNavigate } from 'react-router-dom';
import { Tag } from '../../components/core/Tag';
import { useSearch, type SearchState } from '../../lib/searchState';

/**
 * S16's own rule, finally implemented: "Applied filters do not stay in this
 * panel — they leave as editable chips on the results screen."
 *
 * Until now every answer someone gave in intake and filters vanished the
 * moment results rendered. The search still used them, but nothing on screen
 * said so, which makes three picks look arbitrary and gives no way to loosen
 * a filter short of walking the whole flow again.
 *
 * Each chip does two things, deliberately separated: the body opens the
 * screen that owns that answer, and the × clears just that one answer in
 * place. Clearing re-runs the search immediately — the chips write to the
 * same search state `useDiscovery` keys its query on.
 */

interface ChipSpec {
  key: string;
  label: string;
  /** Where to go to change this answer. */
  to: string;
  /** What "clear this" means for this particular answer. */
  clear: Partial<SearchState>;
}

function chipsFor(search: SearchState): ChipSpec[] {
  const chips: ChipSpec[] = [];
  const intake = '/intake';
  const filters = '/filters';

  if (search.who) {
    chips.push({ key: 'who', label: search.who, to: intake, clear: { who: null } });
  }
  if (search.occasion) {
    chips.push({
      key: 'occasion',
      label: search.occasion,
      to: intake,
      clear: { occasion: null },
    });
  }

  // The hard constraint reads as one chip whichever of the three forms it
  // took, because that is how the person thinks of it — "I have 20 minutes",
  // not "constraintMode: time".
  if (search.constraintMode === 'radius' && search.radiusKm.trim()) {
    chips.push({
      key: 'radius',
      label: `Within ${search.radiusKm.trim()} km`,
      to: intake,
      clear: { radiusKm: '', constraintMode: 'radius' },
    });
  } else if (search.constraintMode === 'time' && search.timeMinutes.trim()) {
    chips.push({
      key: 'time',
      label: `${search.timeMinutes.trim()} min`,
      to: intake,
      clear: { timeMinutes: '', constraintMode: 'time' },
    });
  }
  if (search.budgetCap) {
    chips.push({
      key: 'budgetCap',
      label: search.budgetCap,
      to: intake,
      clear: { budgetCap: null },
    });
  }
  if (search.areaText.trim()) {
    chips.push({
      key: 'area',
      label: search.areaText.trim(),
      to: intake,
      // Dropping the area drops the coordinates resolved for it too —
      // keeping a centre for an area nobody asked for is how results end up
      // clipped around somewhere the person never named.
      clear:
        search.centerSource === 'area'
          ? { areaText: '', areaPlaceId: null, center: null, centerSource: null }
          : { areaText: '', areaPlaceId: null },
    });
  }

  for (const vibe of search.vibes) {
    chips.push({
      key: `vibe:${vibe}`,
      label: vibe,
      to: filters,
      clear: { vibes: search.vibes.filter((v) => v !== vibe) },
    });
  }
  if (search.budget) {
    chips.push({ key: 'budget', label: search.budget, to: filters, clear: { budget: null } });
  }
  if (search.kitchen && search.door === 'eat') {
    chips.push({ key: 'kitchen', label: search.kitchen, to: filters, clear: { kitchen: null } });
  }
  if (search.areaType && search.door === 'explore') {
    chips.push({
      key: 'areaType',
      label: search.areaType,
      to: filters,
      clear: { areaType: null },
    });
  }

  const switches: Array<[boolean, string, Partial<SearchState>]> = [
    [search.openNow, 'Open now', { openNow: false }],
    [search.openLate, 'Open late', { openLate: false }],
    [search.allowsPets, 'Allows pets', { allowsPets: false }],
    [search.servesPetFood, 'Serves pet food', { servesPetFood: false }],
    [search.familyFriendly, 'Family friendly', { familyFriendly: false }],
    [search.coupleFriendly, 'Couple friendly', { coupleFriendly: false }],
    [
      search.waitCare,
      search.door === 'eat' ? 'Skip long waits' : 'Avoid crowded times',
      { waitCare: false },
    ],
  ];
  for (const [on, label, clear] of switches) {
    if (on) chips.push({ key: label, label, to: filters, clear });
  }

  return chips;
}

export function AppliedFilterChips() {
  const navigate = useNavigate();
  const { search, setSearch } = useSearch();
  const chips = chipsFor(search);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        alignItems: 'center',
        marginBottom: 'var(--space-5)',
      }}
    >
      {chips.length === 0 ? (
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          No filters applied.
        </span>
      ) : (
        chips.map((chip) => (
          <Tag
            key={chip.key}
            selected
            onClick={() => navigate(chip.to)}
            onRemove={() => setSearch(chip.clear)}
            removeLabel={`Remove ${chip.label}`}
          >
            {chip.label}
          </Tag>
        ))
      )}
      <Tag icon="sliders-horizontal" onClick={() => navigate('/filters')}>
        {chips.length === 0 ? 'Add filters' : 'Edit filters'}
      </Tag>
    </div>
  );
}
