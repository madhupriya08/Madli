import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { SearchEntryScreen } from './SearchEntryScreen';

/**
 * Phase 6 §2 regression: the Search tab (S52) used to throw away whatever
 * was typed and navigate straight to whatever generic filtered results were
 * already in search state — so searching for a real, seeded place name
 * ("Mehfil") returned unrelated results instead of that place. These tests
 * reproduce that exact repro (type the name, submit, check what happens)
 * against the fix: a real name search against the catalogue.
 */

function Harness() {
  return (
    <PersonaProvider>
      <MemoryRouter initialEntries={['/search']}>
        <Routes>
          <Route path="/search" element={<SearchEntryScreen />} />
          <Route path="/places/:slug" element={<h1>place detail</h1>} />
          <Route path="/intake" element={<h1>intake</h1>} />
        </Routes>
      </MemoryRouter>
    </PersonaProvider>
  );
}

describe('SearchEntryScreen — S52 direct name search', () => {
  it('finds a known seeded place by its exact name, not generic unrelated results', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Mehfil{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mehfil · Alwal/ })).toBeInTheDocument();
  });

  it('matches case-insensitively', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'mehfil{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
  });

  it('matches on a partial name', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'meh{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
  });

  it('clicking a match opens that exact place, not a generic results list', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Mehfil{enter}');

    await userEvent.click(await screen.findByRole('button', { name: /Mehfil · Alwal/ }));
    expect(await screen.findByRole('heading', { name: 'place detail' })).toBeInTheDocument();
  });

  it('a query matching nothing in the catalogue shows a real empty state, not a silent redirect', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'zzzznonexistentplace{enter}');

    expect(await screen.findByText('No matches')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'place detail' })).not.toBeInTheDocument();
  });
});
