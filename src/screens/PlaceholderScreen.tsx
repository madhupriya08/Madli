import { EmptyState } from '../components/feedback/EmptyState';
import type { ScreenMeta } from './registry';

/** Used only for registry entries not yet wired to a real screen component. */
export function PlaceholderScreen({ meta }: { meta: ScreenMeta }) {
  return (
    <div style={{ padding: 'var(--space-9) var(--gutter-mobile)' }}>
      <EmptyState
        icon="hammer"
        title={`${meta.id} · ${meta.name}`}
        body={`States: ${meta.states.join(', ')} · Roles: ${meta.roles}`}
      />
    </div>
  );
}
