import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Switch } from '../../components/forms/Switch';
import { Tag } from '../../components/core/Tag';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { useSearch, type AreaType } from '../../lib/searchState';

const AREA_TYPES: AreaType[] = ['Indoor', 'Outdoor', 'Mixed'];

// S16: side drawer on desktop, full-screen sheet on mobile (approximated here
// via Dialog's modal/sheet variants). Pets is deliberately two separate
// switches — allows pets and serves pet food are different questions. Area
// type only exists behind the Explore door; on Eat it's absent, not disabled.
// "Save this set" is User only.
export function FiltersScreen({ door = 'eat' }: { door?: 'eat' | 'explore' }) {
  const { breakpoint, persona } = usePersona();
  const navigate = useNavigate();
  // Filters write straight into the shared search state, so "Apply" carries
  // the choices to results rather than discarding them on navigate.
  const { search, setSearch } = useSearch();
  const { allowsPets, servesPetFood, areaType } = search;
  const setAllowsPets = (v: boolean) => setSearch({ allowsPets: v });
  const setServesPetFood = (v: boolean) => setSearch({ servesPetFood: v });
  const setAreaType = (v: AreaType | null) => setSearch({ areaType: v });

  return (
    <Dialog
      open
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
      title="Filters"
      onClose={() => navigate(-1)}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
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
        <Switch label="Allows pets" checked={allowsPets} onChange={setAllowsPets} />
        <Switch label="Serves pet food" checked={servesPetFood} onChange={setServesPetFood} />

        {door === 'explore' ? (
          <div>
            <h4 style={{ font: 'var(--type-label)', marginBottom: 'var(--space-2)' }}>Area type</h4>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {AREA_TYPES.map((t) => (
                <Tag
                  key={t}
                  selected={areaType === t}
                  onClick={() => setAreaType(areaType === t ? null : t)}
                >
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        ) : null}

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
