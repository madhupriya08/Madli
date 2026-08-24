import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { useLogRankedVisit, useComparisonTargets } from '../../data/hooks';
import { placeById } from '../../fixtures/places';
import { appConfig } from '../../fixtures/appConfig';
import type { Tier } from '../../fixtures/mockDb';

interface NavState {
  placeId: string;
  tier: Tier;
}

// S26: this is real — the choice runs a binary insert against the actual
// ranked list, and S27 shows the true resulting position. "First in
// category" skips comparison entirely and says why. Same mechanic is reused
// by S29's ranking onboarding.
export function LogVisitComparisonScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { breakpoint, userId } = usePersona();
  const logVisit = useLogRankedVisit(userId);
  const state = location.state as NavState | null;
  const [step, setStep] = useState<1 | 2>(1);
  const [choice1, setChoice1] = useState<boolean | null>(null);
  const newPlace = state ? placeById(state.placeId) : undefined;
  const { data: targets, isLoading: targetsLoading } = useComparisonTargets(
    userId,
    newPlace?.categoryId,
  );

  // Phase 4 §9: navigate() moved into an effect, not called during render —
  // see ClaimStatusScreen for why (PHASE_4_QA_REPORT.md §9).
  useEffect(() => {
    if (!state || !newPlace) navigate('/log-visit');
  }, [state, newPlace, navigate]);

  if (!state || !newPlace) return null;

  const compareTarget1 = targets?.first ? placeById(targets.first) : undefined;
  const compareTarget2 = targets?.second ? placeById(targets.second) : undefined;
  const secondComparisonSkippable = appConfig.secondComparisonMode !== 'always';

  if (targetsLoading) {
    return (
      <AppShell title="Which do you prefer?" onBack={() => navigate(-1)} showTabBar={false}>
        <div style={{ padding: 'var(--space-6) var(--gutter)' }} aria-busy="true" />
      </AppShell>
    );
  }

  const submit = async (preferredNew1?: boolean, preferredNew2?: boolean) => {
    const result = await logVisit.mutateAsync({
      placeId: state.placeId,
      tier: state.tier,
      compare1:
        compareTarget1 && preferredNew1 != null
          ? { placeId: compareTarget1.id, preferredNew: preferredNew1 }
          : undefined,
      compare2:
        compareTarget2 && preferredNew2 != null
          ? { placeId: compareTarget2.id, preferredNew: preferredNew2 }
          : undefined,
    });
    navigate('/log-visit/landed', { state: { ...result, placeName: newPlace.name } });
  };

  if (!compareTarget1) {
    // First-in-category path.
    return (
      <AppShell title="Almost done" onBack={() => navigate(-1)} showTabBar={false}>
        <div style={{ padding: 'var(--space-6) var(--gutter)', textAlign: 'center' }}>
          <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-5)' }}>
            {newPlace.name} is the first place you&apos;ve ranked in this category — nothing to
            compare it against yet.
          </p>
          <Button onClick={() => submit()}>Add to my list</Button>
        </div>
      </AppShell>
    );
  }

  const compareTarget = step === 1 ? compareTarget1 : compareTarget2!;
  const columns = breakpoint === 'desktop' ? 'repeat(2, 1fr)' : '1fr';

  return (
    <AppShell title="Which do you prefer?" onBack={() => navigate(-1)} showTabBar={false}>
      <div style={{ padding: 'var(--space-6) var(--gutter)' }}>
        <p
          style={{
            font: 'var(--type-caption)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-5)',
          }}
        >
          Comparison {step} of {compareTarget2 ? 2 : 1}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 'var(--space-4)' }}>
          <Card
            interactive
            onClick={() => {
              if (step === 1) {
                setChoice1(true);
                if (compareTarget2 && secondComparisonSkippable === true) {
                  setStep(2);
                } else if (compareTarget2) {
                  setStep(2);
                } else {
                  void submit(true);
                }
              } else {
                void submit(choice1 ?? true, true);
              }
            }}
          >
            <h3 style={{ font: 'var(--type-h4)' }}>{newPlace.name}</h3>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Your new visit
            </p>
          </Card>
          <Card
            interactive
            onClick={() => {
              if (step === 1) {
                setChoice1(false);
                if (compareTarget2) {
                  setStep(2);
                } else {
                  void submit(false);
                }
              } else {
                void submit(choice1 ?? false, false);
              }
            }}
          >
            <h3 style={{ font: 'var(--type-h4)' }}>{compareTarget.name}</h3>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Already on your list
            </p>
          </Card>
        </div>
        {step === 2 && secondComparisonSkippable ? (
          <button
            onClick={() => void submit(choice1 ?? true)}
            style={{
              marginTop: 'var(--space-5)',
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
            }}
          >
            Skip this comparison
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
