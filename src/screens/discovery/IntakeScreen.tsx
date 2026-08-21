import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tag } from '../../components/core/Tag';
import { Tabs } from '../../components/navigation/Tabs';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';

const VIBES = ['Quick bite', 'Date night', 'Family', 'Solo', 'Celebration', 'Late night'];

// S15: real divergence, not a reflow. Desktop holds all steps in one panel
// because a 1280 canvas can show the whole ask at once; mobile walks one step
// at a time with a progress bar. "Skip and browse" is always visible. The
// constraint step is a toggle (time vs radius), never both at once.
export function IntakeScreen() {
  const { breakpoint } = usePersona();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [vibe, setVibe] = useState<string | null>(null);
  const [constraintMode, setConstraintMode] = useState<'time' | 'radius'>('time');
  const [constraintValue, setConstraintValue] = useState('');
  const [area, setArea] = useState('');

  const steps = [
    {
      title: 'What are you after?',
      body: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {VIBES.map((v) => (
            <Tag key={v} selected={vibe === v} onClick={() => setVibe(v)}>
              {v}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Time or distance?',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Tabs
            items={[
              { value: 'time', label: 'How much time' },
              { value: 'radius', label: 'How far' },
            ]}
            value={constraintMode}
            onChange={(v) => setConstraintMode(v as 'time' | 'radius')}
          />
          <Input
            label={constraintMode === 'time' ? 'Minutes you have' : 'Distance (km)'}
            value={constraintValue}
            onChange={(e) => setConstraintValue(e.target.value)}
            type="number"
          />
        </div>
      ),
    },
    {
      title: 'Which area?',
      body: (
        <Input
          label="Neighbourhood"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="e.g. Jubilee Hills"
        />
      ),
    },
  ];

  const skipAndBrowse = () => navigate('/results/eat');
  const finish = () => navigate('/filters');

  if (breakpoint === 'desktop') {
    // Real divergence: all three steps visible in one panel.
    return (
      <AppShell title="Tell us what you're after" onBack={() => navigate(-1)} showTabBar={false}>
        <div
          style={{
            padding: 'var(--space-7) var(--gutter-desktop)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-7)',
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
          padding: 'var(--space-6) var(--gutter-mobile)',
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
