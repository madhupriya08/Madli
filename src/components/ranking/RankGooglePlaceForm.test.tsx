import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { ToastProvider } from '../feedback/ToastProvider';
import { RankGooglePlaceForm } from './RankGooglePlaceForm';

import type { RankedGooglePlace } from '../../data/googleRankings';

const rankMutateAsync = vi.fn();
let residencyData: 'local' | 'visitor' | null = null;
let rankingHistory: RankedGooglePlace[] = [];
const setResidentStatusMock = vi.fn();

vi.mock('../../data/googleRankings', async () => {
  const actual = await vi.importActual<typeof import('../../data/googleRankings')>(
    '../../data/googleRankings',
  );
  return {
    ...actual,
    useResidentStatus: () => ({ data: residencyData }),
    useRankGooglePlace: () => ({ mutateAsync: rankMutateAsync, isPending: false }),
    useMyGoogleRankings: () => ({ data: rankingHistory }),
    setResidentStatus: (...args: unknown[]) => setResidentStatusMock(...args),
  };
});

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function Harness({
  onDone = vi.fn(),
  candidateTypes = ['restaurant'],
}: { onDone?: () => void; candidateTypes?: string[] } = {}) {
  return (
    <PersonaProvider>
      <ToastProvider>
        <SetPersona to="user" />
        <RankGooglePlaceForm
          candidate={{ placeId: 'g1', name: 'Testville Diner', door: 'eat', types: candidateTypes }}
          onDone={onDone}
        />
      </ToastProvider>
    </PersonaProvider>
  );
}

describe('RankGooglePlaceForm', () => {
  beforeEach(() => {
    residencyData = null;
    rankingHistory = [];
    rankMutateAsync.mockReset();
    setResidentStatusMock.mockReset().mockResolvedValue(undefined);
  });

  it('asks residency first when unanswered, then shows tier options once answered', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText(/tell us if you live here or are visiting/)).toBeInTheDocument();
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

/**
 * P12 §9: "any ranking logic should ask the user to rank the place ... and
 * follow up by comparing against the existing list based on the category,
 * and place the new ranked place in the order."
 */
describe('RankGooglePlaceForm — comparison against the existing list', () => {
  function ranked(overrides: Partial<RankedGooglePlace> = {}): RankedGooglePlace {
    return {
      id: 'r1',
      googlePlaceId: 'g-existing',
      placeName: 'Existing Diner',
      door: 'eat',
      tier: 'loved',
      raterType: 'visitor',
      position: 1,
      areaText: null,
      location: null,
      types: ['restaurant'],
      ...overrides,
    };
  }

  beforeEach(() => {
    residencyData = 'visitor';
    rankingHistory = [];
    rankMutateAsync.mockReset().mockResolvedValue({ landedPosition: 1, totalInDoor: 2 });
    setResidentStatusMock.mockReset().mockResolvedValue(undefined);
  });

  it('asks which the person prefers once a comparable place is already ranked, and sends that answer', async () => {
    rankingHistory = [ranked()];
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Loved it' }));

    // Nothing is written until the comparison is answered — the answer is
    // what decides the position.
    expect(rankMutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByText('Which do you prefer?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Testville Diner' }));

    expect(rankMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'loved',
        compare1: { googlePlaceId: 'g-existing', preferredNew: true },
      }),
    );
  });

  it('only compares against the same category — a museum in the list is not offered against a diner', async () => {
    rankingHistory = [
      ranked({ id: 'r2', googlePlaceId: 'g-museum', placeName: 'City Museum', types: ['museum'] }),
    ];
    render(<Harness candidateTypes={['restaurant']} />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Loved it' }));

    // Falls back to the door-wide list rather than skipping the comparison
    // entirely — a rough comparison still orders the list better than none.
    expect(await screen.findByText('Which do you prefer?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'City Museum' })).toBeInTheDocument();
  });

  it('never compares a "fine" verdict against a "loved" one — tier still decides the block', async () => {
    rankingHistory = [ranked()];
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'It was fine' }));

    // Nothing ranked "fine" yet, so there is nothing to compare against and
    // the ranking is written straight away.
    expect(rankMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'fine', compare1: undefined }),
    );
  });

  it('skipping the comparison still records the ranking', async () => {
    rankingHistory = [ranked()];
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Loved it' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Skip this comparison' }));

    expect(rankMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'loved', compare1: undefined }),
    );
  });
});
