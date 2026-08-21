import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminShell } from '../layout/AdminShell';
import { Input } from '../../components/forms/Input';
import { Select } from '../../components/forms/Select';
import { Button } from '../../components/core/Button';
import { useToast } from '../../components/feedback/ToastProvider';
import { placeById } from '../../fixtures/places';
import { categories } from '../../fixtures/categories';

// S44: category is called out as the comparison bucket — getting it wrong
// puts a place in the wrong ranked list, the most expensive data error in
// the product. The one-liner field says what a good reason contains.
export function CatalogueEditScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const isCreate = id === 'new';
  const place = !isCreate && id ? placeById(id) : undefined;

  const [name, setName] = useState(place?.name ?? '');
  const [categoryId, setCategoryId] = useState(place?.categoryId ?? categories[0].id);
  const [reason, setReason] = useState(place?.reason ?? '');

  return (
    <AdminShell title={isCreate ? 'Add place' : `Edit ${place?.name ?? ''}`}>
      <div
        style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select
          label="Category — the pairwise comparison bucket"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          hint="Getting this wrong puts the place in the wrong ranked list — the most expensive catalogue error."
        />
        <Input
          label="Reason (the one-line why)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          hint="One real, specific reason a local gave — not a generic compliment."
        />
        <Button
          onClick={() => {
            show(isCreate ? 'Place created.' : 'Place updated.');
            navigate('/admin/catalogue');
          }}
        >
          {isCreate ? 'Create place' : 'Save changes'}
        </Button>
      </div>
    </AdminShell>
  );
}
