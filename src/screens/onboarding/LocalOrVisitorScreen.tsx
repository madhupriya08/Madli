import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tag } from '../../components/core/Tag';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { useSearch } from '../../lib/searchState';
import { useGuestSession, type ResidentStatus } from '../../lib/guestSession';
import { setResidentStatus } from '../../data/googleRankings';

interface LocalOrVisitorNavState {
  /** Where to continue once answered (or skipped). */
  next?: string;
}

/**
 * New step, inserted right after S8 (`/area`): are you local to this area,
 * or visiting it. Not one of the original 52 screens — a real gap this
 * round asked to close, not a refinement of one that already existed.
 *
 * Placed here rather than left where it used to be asked (S29's optional
 * ranking step): this is the moment the person has just settled on a place,
 * so the question reads as "are you from around here" rather than an
 * unexplained profile field. It is also asked once for the whole session
 * instead of every time someone happens to reach the ranking flow.
 *
 * Not required — unlike S8, nothing here forces an answer. It is a
 * preference signal, not something search itself needs to function, so
 * skipping leaves the rest of the app fully working.
 *
 * Guest: session-only, in guestSession.tsx alongside the reject list and
 * search counter — there is no profile row to hold it, by the same rule
 * every other guest field here already follows.
 *
 * Signed in: profiles.resident_status — a column that already existed for
 * the optional Google-place ranking flow (src/data/googleRankings.ts). This
 * is that same value, asked earlier and once, not a second copy of it.
 */
export function LocalOrVisitorScreen() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { show } = useToast();
  const { persona } = usePersona();
  const { search } = useSearch();
  const guestSession = useGuestSession();
  const next = (routerLocation.state as LocalOrVisitorNavState | null)?.next ?? '/app';

  const currentAnswer: ResidentStatus | null =
    persona === 'guest' ? guestSession.residentStatus : null;

  const choose = async (status: ResidentStatus) => {
    if (persona === 'guest') {
      guestSession.setResidentStatus(status);
      navigate(next);
      return;
    }
    try {
      await setResidentStatus(status, search.areaText.trim() || null);
      navigate(next);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save that. Try again in a moment.');
    }
  };

  return (
    <AppShell title="Are you local?" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-9) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-5)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ font: 'var(--type-h3)' }}>
          {search.areaText ? `Do you live around ${search.areaText}?` : 'Do you live around here?'}
        </h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)', maxWidth: '38ch' }}>
          We keep local and visitor rankings apart, and show both counts on every pick. Entirely
          optional, skip it and everything still works.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Tag selected={currentAnswer === 'local'} onClick={() => void choose('local')}>
            I live here
          </Tag>
          <Tag selected={currentAnswer === 'visitor'} onClick={() => void choose('visitor')}>
            I&apos;m visiting
          </Tag>
        </div>
        <button
          onClick={() => navigate(next)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-link)',
            cursor: 'pointer',
            font: 'var(--type-body-sm)',
          }}
        >
          Skip for now
        </button>
      </div>
    </AppShell>
  );
}
