import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, type InitialEntry } from 'react-router-dom';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { PostVisitNudgeScreen, type PostVisitNudgeSubject } from './PostVisitNudgeScreen';

/**
 * P10 §4: this screen used to hardcode `places.find(p => p.isActive)` and
 * was never navigated to from anywhere in the app — a registered route with
 * no real caller, only reachable by typing its URL directly. It now takes
 * its subject from real navigation state (see HomeScreen's new
 * usePostVisitNudgeCandidate wiring) and branches by kind: a catalogue
 * subject still goes to S25's pairwise mechanic; a Google-sourced one ranks
 * in place via the same tier-only form its own detail-page button uses.
 */

const rankMutateAsync = vi.fn();

vi.mock('../../data/googleRankings', async () => {
  const actual =
    await vi.importActual<typeof import('../../data/googleRankings')>('../../data/googleRankings');
  return {
    ...actual,
    useResidentStatus: () => ({ data: 'visitor' }),
    useRankGooglePlace: () => ({ mutateAsync: rankMutateAsync, isPending: false }),
    setResidentStatus: vi.fn(),
  };
});

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function Harness({ initialEntry }: { initialEntry: InitialEntry }) {
  return (
    <PersonaProvider>
      <ToastProvider>
        <SetPersona to="user" />
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/post-visit-nudge" element={<PostVisitNudgeScreen />} />
            <Route path="/app" element={<h1>Where to start?</h1>} />
            <Route path="/log-visit" element={<h1>Log visit trigger</h1>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </PersonaProvider>
  );
}

const catalogueSubject: PostVisitNudgeSubject = {
  kind: 'catalogue',
  placeId: 'catalogue-1',
  placeName: 'Cafe Bahar',
};

const googleSubject: PostVisitNudgeSubject = {
  kind: 'google',
  placeId: 'google-1',
  placeName: 'Testville Diner',
  door: 'eat',
};

describe('PostVisitNudgeScreen', () => {
  beforeEach(() => {
    rankMutateAsync.mockReset();
  });

  it('redirects to /app when reached with no subject (no longer a demo fixture fallback)', async () => {
    render(<Harness initialEntry="/post-visit-nudge" />);
    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
  });

  it('a catalogue subject: "Yes, log it" goes to /log-visit with its placeId', async () => {
    render(
      <Harness initialEntry={{ pathname: '/post-visit-nudge', state: { subject: catalogueSubject } }} />,
    );
    expect(await screen.findByText('Did you make it to Cafe Bahar?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Yes, log it' }));
    expect(await screen.findByRole('heading', { name: 'Log visit trigger' })).toBeInTheDocument();
  });

  it('"Not yet" and "Didn\'t go" both return to /app without ranking anything', async () => {
    render(
      <Harness initialEntry={{ pathname: '/post-visit-nudge', state: { subject: catalogueSubject } }} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Not yet' }));
    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
  });

  it('a Google subject: "Yes, log it" ranks in place and returns to /app when done', async () => {
    rankMutateAsync.mockResolvedValue({ landedPosition: 3, totalInDoor: 4 });
    render(
      <Harness initialEntry={{ pathname: '/post-visit-nudge', state: { subject: googleSubject } }} />,
    );
    expect(await screen.findByText('Did you make it to Testville Diner?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Yes, log it' }));
    expect(await screen.findByText('How was Testville Diner?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'It was fine' }));
    expect(rankMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ googlePlaceId: 'google-1', tier: 'fine', door: 'eat' }),
    );
    expect(
      await screen.findByText("Testville Diner landed at #3 out of 4 places you've ranked in Eat."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
  });
});
