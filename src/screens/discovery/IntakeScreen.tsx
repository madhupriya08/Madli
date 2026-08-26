import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tag } from '../../components/core/Tag';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import {
  useSearch,
  WHO_OPTIONS,
  OCCASION_OPTIONS,
  BUDGET_CAP_OPTIONS,
} from '../../lib/searchState';

// S15: real divergence, not a reflow. Desktop holds all steps in one panel
// because a 1280 canvas can show the whole ask at once; mobile walks one step
// at a time with a progress bar. "Skip and browse" is always visible.
//
// Four groups, matching the design's own intake summary — "Who is it for",
// "The occasion", "Hard constraint", "Area". The first two used to be one
// merged "what are you after?" vibe list, which collapsed two different
// questions (who you are with vs. what the outing is) into one answer and
// left the design's vibe chips with nowhere to live. Those now sit in S16
// where the design puts them.
//
// The hard constraint keeps minutes and kilometres as two separate fields —
// the last one edited drives the radius — and adds the budget cap the design
// offers as its third option.
export function IntakeScreen() {
  const { breakpoint } = usePersona();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  // Intake used to collect all of this into local state and then navigate
  // away, dropping every answer — results queried on `type` alone. It now
  // writes into the shared search state that results and the map read.
  const { search, setSearch } = useSearch();
  const { who, occasion, budgetCap, timeMinutes, radiusKm, areaText: area, door } = search;

  const toggle = <T extends string>(current: T | null, value: T) =>
    current === value ? null : value;

  const chipRow = (
    options: readonly string[],
    selected: string | null,
    onPick: (v: string | null) => void,
  ) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {options.map((o) => (
        <Tag key={o} selected={selected === o} onClick={() => onPick(toggle(selected, o))}>
          {o}
        </Tag>
      ))}
    </div>
  );

  const steps = [
    {
      title: 'Who is it for?',
      body: chipRow(WHO_OPTIONS, who, (v) => setSearch({ who: v })),
    },
    {
      title: "What's the occasion?",
      body: chipRow(OCCASION_OPTIONS, occasion, (v) => setSearch({ occasion: v })),
    },
    {
      title: "What's the hard limit?",
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Minutes you have"
            value={timeMinutes}
            onChange={(e) => setSearch({ timeMinutes: e.target.value, constraintMode: 'time' })}
            type="number"
            placeholder="e.g. 20"
          />
          <Input
            label="Distance (km)"
            value={radiusKm}
            onChange={(e) => setSearch({ radiusKm: e.target.value, constraintMode: 'radius' })}
            type="number"
            placeholder="e.g. 5"
          />
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            Fill one. The last field you edit is what we search with.
          </p>
          <div>
            <h4 style={{ font: 'var(--type-label)', marginBottom: 'var(--space-2)' }}>
              Budget cap
            </h4>
            {chipRow(BUDGET_CAP_OPTIONS, budgetCap, (v) => setSearch({ budgetCap: v }))}
          </div>
        </div>
      ),
    },
    {
      title: 'Which area?',
      body: (
        <Input
          label="Neighbourhood"
          value={area}
          // Typing a new area invalidates the coordinates resolved for the old one.
          onChange={(e) => setSearch({ areaText: e.target.value, areaPlaceId: null })}
          placeholder="e.g. Jubilee Hills"
        />
      ),
    },
  ];

  const skipAndBrowse = () => {
    navigate(door === 'explore' ? '/results/explore' : '/results/eat');
  };
  const finish = () => navigate('/filters');

  if (breakpoint === 'desktop') {
    // Real divergence: every step visible in one panel.
    return (
      <AppShell title="Tell us what you're after" onBack={() => navigate(-1)} showTabBar={false}>
        <div
          style={{
            padding: 'var(--space-7) var(--gutter-desktop)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-7)',
            alignItems: 'start',
          }}
        >
          {steps.map((s) => (
            <div key={s.title}>
              <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-4)' }}>{s.title}</h3>
              {s.body}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 var(--gutter-desktop) var(--space-7)',
          }}
        >
          <button
            onClick={skipAndBrowse}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
            }}
          >
            Skip and browse
          </button>
          <Button onClick={finish}>See picks</Button>
        </div>
      </AppShell>
    );
  }

  // Mobile: one step at a time with a progress bar.
  const current = steps[step];
  return (
    <AppShell
      title={current.title}
      onBack={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
      showTabBar={false}
    >
      <div
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Step ${step + 1} of ${steps.length}`}
        style={{ height: 3, background: 'var(--surface-sunken)' }}
      >
        <div
          style={{
            width: `${((step + 1) / steps.length) * 100}%`,
            height: '100%',
            background: 'var(--teal-500)',
          }}
        />
      </div>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        {current.body}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={skipAndBrowse}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
            }}
          >
            Skip and browse
          </button>
          <Button onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}>
            {step === steps.length - 1 ? 'See picks' : 'Next'}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
