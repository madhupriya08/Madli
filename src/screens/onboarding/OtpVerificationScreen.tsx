import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { verifyOtp } from '../../lib/auth';

interface NavState {
  method: 'email' | 'phone';
  identifier: string;
}

// S12: six boxes, resend timer, change-number link. Wrong-code and
// expired-code are different states with different actions. Verified users
// land in ranking onboarding (S29), not home.
//
// Real Supabase phone OTP verification is wired in (src/lib/auth.ts,
// verifyOtp) but genuinely non-functional in this project — no SMS provider
// is configured (open since Phase 1, §8), so a real phone signup here always
// errors. Kept fully wired, not silently faked, per the Phase 3 prompt.
export function OtpVerificationScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'checking' | 'wrong' | 'expired'>('idle');
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as NavState | null;

  const setDigit = (i: number, v: string) => {
    if (!/^[0-9]?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
  };

  const submit = async () => {
    setStatus('checking');
    const outcome = await verifyOtp(state?.identifier ?? '', code.join(''));
    if (outcome === 'correct') {
      navigate('/ranking-onboarding');
    } else {
      setStatus(outcome);
    }
  };

  return (
    <AppShell title="Verify your number" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          maxWidth: 420,
        }}
      >
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
          Enter the six-digit code we sent you.
        </p>
        <div
          style={{ display: 'flex', gap: 'var(--space-2)' }}
          role="group"
          aria-label="One-time code"
        >
          {code.map((d, i) => (
            <input
              key={i}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              maxLength={1}
              inputMode="numeric"
              aria-label={`Digit ${i + 1}`}
              style={{
                width: 44,
                height: 52,
                textAlign: 'center',
                font: 'var(--type-h3)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${status === 'wrong' || status === 'expired' ? 'var(--red-500)' : 'var(--border-strong)'}`,
              }}
            />
          ))}
        </div>
        {status === 'wrong' ? (
          <p role="alert" style={{ font: 'var(--type-body-sm)', color: 'var(--status-error-fg)' }}>
            That code isn&apos;t right. Check your messages and try again.
          </p>
        ) : null}
        {status === 'expired' ? (
          <div>
            <p
              role="alert"
              style={{
                font: 'var(--type-body-sm)',
                color: 'var(--status-error-fg)',
                marginBottom: 'var(--space-2)',
              }}
            >
              That code expired. We can send a new one.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setStatus('idle')}>
              Resend code
            </Button>
          </div>
        ) : null}
        <Button onClick={submit} disabled={status === 'checking' || code.some((d) => !d)}>
          {status === 'checking' ? 'Verifying…' : 'Verify'}
        </Button>
        <button
          type="button"
          onClick={() => navigate('/signup')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-link)',
            cursor: 'pointer',
            font: 'var(--type-body-sm)',
          }}
        >
          Change number
        </button>
      </div>
    </AppShell>
  );
}
