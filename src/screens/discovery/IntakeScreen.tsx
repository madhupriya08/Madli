import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tag } from '../../components/core/Tag';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import {
  useSearch,
  WHO_OPTIONS,
  OCCASION_OPTIONS,
  BUDGET_CAP_OPTIONS,
  TIME_WINDOW_OPTIONS,
  DRIVE_TIME_OPTIONS,
  type ConstraintMode,
} from '../../lib/searchState';

const CONSTRAINT_TABS: Array<{ mode: ConstraintMode; label: string }> = [
  { mode: 'time', label: 'Time window' },
  { mode: 'drive', label: 'Drive time' },
  { mode: 'budget', label: 'Budget' },
];

// S15: real divergence, not a reflow. Desktop holds all steps in one panel
// because a 1280 canvas can show the whole ask at once; mobile walks one step
// at a time with a progress bar. "Skip and browse" is always visible.
//
// Three groups, matching the prototype's own step list exactly — "Who is it
// for", "The occasion", "Your one constraint". There is no separate area
// step here: that answer is now settled at S8 (PickAreaScreen), a required
// stop before Home, before intake is ever reached — asking again here would
// be the same question a second time in one flow. (An earlier build of this
// screen predates that S8/S9 merge and still asked for area itself.)
//
// The hard constraint is a real three-way toggle — Time window / Drive time
// / Budget — not two freeform number fields shown at once. That used to be a
// misreading of the design: "minutes you have" and "distance (km)" read as
// one axis with two units, but the actual design asks three different
// questions (when are you going / how far will you drive / what can you
// spend) and only one applies at a time, each with fixed preset chips
// rather than free text.
export function IntakeScreen() {
  const { breakpoint } = usePersona();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  // Intake used to collect all of this into local state and then navigate
  // away, dropping every answer — results queried on `type` alone. It now
  // writes into the shared search state that results and the map read.
  const { search, setSearch } = useSearch();
  const { who, occasion, budgetCap, constraintMode, timeWindow, driveTimePreset, door } = search;

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
      title: 'Your one hard constraint',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            Pick the one that actually decides it. The others we will work around.
          </p>
          <div
            style={{
              display: 'inline-flex',
              gap: 2,
              padding: 3,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-sunken)',
              width: 'fit-content',
            }}
          >
            {CONSTRAINT_TABS.map((tab) => (
              <button
                key={tab.mode}
                onClick={() => setSearch({ constraintMode: tab.mode })}
                style={{
                  padding: '6px 14px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  font: 'var(--type-label)',
                  color: 'var(--text-heading)',
                  background: constraintMode === tab.mode ? 'var(--white)' : 'transparent',
                  boxShadow: constraintMode === tab.mode ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {constraintMode === 'time'
            ? chipRow(TIME_WINDOW_OPTIONS, timeWindow, (v) => setSearch({ timeWindow: v }))
            : null}
          {constraintMode === 'drive'
            ? chipRow(DRIVE_TIME_OPTIONS, driveTimePreset, (v) =>
                setSearch({ driveTimePreset: v }),
              )
            : null}
          {constraintMode === 'budget'
            ? chipRow(BUDGET_CAP_OPTIONS, budgetCap, (v) => setSearch({ budgetCap: v }))
            : null}
        </div>
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
