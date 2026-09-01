import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { ToastProvider } from '../feedback/ToastProvider';
import { RankGooglePlaceForm } from './RankGooglePlaceForm';

const rankMutateAsync = vi.fn();
let residencyData: 'local' | 'visitor' | null = null;
const setResidentStatusMock = vi.fn();

vi.mock('../../data/googleRankings', async () => {
  const actual =
    await vi.importActual<typeof import('../../data/googleRankings')>('../../data/googleRankings');
  return {
    ...actual,
    useResidentStatus: () => ({ data: residencyData }),
    useRankGooglePlace: () => ({ mutateAsync: rankMutateAsync, isPending: false }),
    setResidentStatus: (...args: unknown[]) => setResidentStatusMock(...args),
  };
});

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function Harness({ onDone = vi.fn() }: { onDone?: () => void } = {}) {
  return (
    <PersonaProvider>
      <ToastProvider>
        <SetPersona to="user" />
        <RankGooglePlaceForm
          candidate={{ placeId: 'g1', name: 'Testville Diner', door: 'eat' }}
          onDone={onDone}
        />
      </ToastProvider>
    </PersonaProvider>
  );
}

describe('RankGooglePlaceForm', () => {
  beforeEach(() => {
    residencyData = null;
    rankMutateAsync.mockReset();
    setResidentStatusMock.mockReset().mockResolvedValue(undefined);
  });

  it('asks residency first when unanswered, then shows tier options once answered', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(
      await screen.findByText(/tell us if you live here or are visiting/),
    ).toBeInTheDocument();
    expect(screen.queryByText('How was Testville Diner?')).not.toBeInTheDocument();

    // Simulating the residency write actually landing — this component reads
    // from useResidentStatus, which the mock above holds fixed, so flipping
    // it directly here stands in for the real query refetching.
    await userEvent.click(screen.getByText('I live here'));
    expect(setResidentStatusMock).toHaveBeenCalledWith('local', null);
  });

  it('goes straight to tier options when residency is already answered', async () => {
    residencyData = 'visitor';
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('How was Testville Diner?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loved it' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'It was fine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Didn't like it" })).toBeInTheDocument();
  });

  it('ranking a tier shows the landed position and calls onDone when closed', async () => {
    residencyData = 'visitor';
    rankMutateAsync.mockResolvedValue({ landedPosition: 1, totalInDoor: 1 });
    const onDone = vi.fn();
    render(<Harness onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Loved it' }));

    expect(rankMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ googlePlaceId: 'g1', tier: 'loved', door: 'eat' }),
    );
    expect(
      await screen.findByText("Testville Diner landed at #1 out of 1 places you've ranked in Eat."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });
});
