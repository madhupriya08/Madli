import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminShell } from '../layout/AdminShell';
import { Badge } from '../../components/core/Badge';
import { Dialog } from '../../components/feedback/Dialog';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import { catalogueStatus } from '../../fixtures/admin';
import type { Place } from '../../fixtures/places';

// S43: global admin table pattern — filter bar, dense rows, detail drawer on
// click. Real divergence: a real table on desktop, a condensed list on mobile.
export function CatalogueListScreen() {
  const { breakpoint } = usePersona();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Place | null>(null);

  const statusTone = (s: string) => (s === 'Live' ? 'success' : s === 'Thin' ? 'warn' : 'neutral');

  return (
    <AdminShell title="Catalogue">
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Button onClick={() => navigate('/admin/catalogue/new/edit')}>Add place</Button>
        <Button
          variant="secondary"
          onClick={() => navigate('/admin/catalogue/bulk-import')}
          style={{ marginLeft: 'var(--space-2)' }}
        >
          Bulk import
        </Button>
      </div>

      {breakpoint === 'desktop' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px' }}>Name</th>
              <th>Category</th>
              <th>Neighbourhood</th>
              <th>Ratings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                style={{ cursor: 'pointer', borderTop: '1px solid var(--border-hairline)' }}
              >
                <td style={{ padding: '8px' }}>{p.name}</td>
                <td>{categoryName(p.categoryId)}</td>
                <td>{p.neighborhood}</td>
                <td>{p.locals.toLocaleString()}</td>
                <td>
                  <Badge tone={statusTone(catalogueStatus(p.id))}>{catalogueStatus(p.id)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {places.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 'var(--space-3)',
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <span>{p.name}</span>
              <Badge tone={statusTone(catalogueStatus(p.id))}>{catalogueStatus(p.id)}</Badge>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} title={selected?.name} onClose={() => setSelected(null)}>
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              {categoryName(selected.categoryId)} · {selected.neighborhood}
            </p>
            <p style={{ font: 'var(--type-body-sm)' }}>
              {selected.locals.toLocaleString()} locals · {selected.visitors.toLocaleString()}{' '}
              visitors
            </p>
            <Button onClick={() => navigate(`/admin/catalogue/${selected.id}/edit`)}>Edit</Button>
          </div>
        ) : null}
      </Dialog>
    </AdminShell>
  );
}
