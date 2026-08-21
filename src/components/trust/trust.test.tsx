import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PickCard } from './PickCard';
import { ReasonNote } from './ReasonNote';
import { RankGap } from './RankGap';
import { SampleSize } from './SampleSize';

describe('PickCard', () => {
  it('renders rank, name, category/neighborhood meta, and the reason', () => {
    render(
      <PickCard
        rank={1}
        name="Hotel Shadab"
        category="Biryani & Kebab"
        neighborhood="Ghansi Bazaar"
        reason="Locals rank it first for a late Ramzan-hours plate."
        locals={412}
        visitors={88}
      />,
    );
    expect(screen.getByText('Hotel Shadab')).toBeInTheDocument();
    expect(screen.getByText(/Biryani & Kebab/)).toBeInTheDocument();
    expect(screen.getByText(/Ghansi Bazaar/)).toBeInTheDocument();
    expect(screen.getByText(/Locals rank it first/)).toBeInTheDocument();
  });

  it('labels the reason "Why this is a gem" and shows the gem badge when gem is true', () => {
    render(<PickCard rank={1} name="Subhan Bakery" reason="Ranked 4th in the city." gem />);
    expect(screen.getByText('Why this is a gem')).toBeInTheDocument();
    expect(screen.getByText('Local gem')).toBeInTheDocument();
  });
});

describe('ReasonNote — 46ch cap', () => {
  it('applies the shared --reason-max token as its max-width, regardless of content length', () => {
    const { container } = render(<ReasonNote>A short reason.</ReasonNote>);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.maxWidth).toBe('var(--reason-max)');
  });

  it('keeps the same cap for a long reason instead of growing to fit it', () => {
    const long =
      'A much longer reason sentence that would otherwise stretch the card well past a comfortable reading width if nothing constrained it.';
    const { container } = render(<ReasonNote>{long}</ReasonNote>);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.maxWidth).toBe('var(--reason-max)');
    expect(screen.getByText(long)).toBeInTheDocument();
  });
});

describe('RankGap', () => {
  it('shows the "Close call" label for a near-tie (close) tone with no explicit points', () => {
    render(<RankGap tone="close" />);
    expect(screen.getByText('Close call')).toBeInTheDocument();
  });

  it('shows the "Thin data" label for the thin tone', () => {
    render(<RankGap tone="thin" />);
    expect(screen.getByText('Thin data')).toBeInTheDocument();
  });

  it('prints an explicit points-based sentence when points are given', () => {
    render(<RankGap tone="clear" points={14} comparedTo="#2" />);
    expect(screen.getByText('+14 pts over #2')).toBeInTheDocument();
  });

  it('lets an explicit note override the generated sentence', () => {
    render(<RankGap tone="clear" note="Custom override text" />);
    expect(screen.getByText('Custom override text')).toBeInTheDocument();
  });
});

describe('SampleSize', () => {
  it('prints the exact locals and visitors counts with the default time window', () => {
    render(<SampleSize locals={412} visitors={88} />);
    expect(screen.getByText('412 locals · 88 visitors · last 90 days')).toBeInTheDocument();
  });

  it('formats larger counts with thousands separators', () => {
    render(<SampleSize locals={1234} visitors={2} />);
    expect(screen.getByText(/1,234 locals/)).toBeInTheDocument();
  });

  it('omits locals/visitors segments that are not provided', () => {
    render(<SampleSize window="last 30 days" />);
    expect(screen.getByText('last 30 days')).toBeInTheDocument();
  });
});
