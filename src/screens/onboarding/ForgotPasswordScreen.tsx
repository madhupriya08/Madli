import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { requestPasswordReset, resetPassword } from '../../lib/auth';

type Stage = 'request' | 'sent' | 'reset' | 'success';

// S14: three states in one screen — request, reset form, success.
export function ForgotPasswordScreen() {
  const [stage, setStage] = useState<Stage>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordReset(email);
      setStage('sent');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(password);
      setStage('success');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <AppShell title="Reset your password" onBack={() => navigate(-1)} showTabBar={false}>
      <div style={{ padding: 'var(--space-6) var(--gutter-mobile)', maxWidth: 420 }}>
        {stage === 'request' ? (
          <form
            onSubmit={requestReset}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
          >
            <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
              Enter your email and we&apos;ll send a reset link.
            </p>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error ?? undefined}
              autoComplete="email"
            />
            <Button type="submit">Send reset link</Button>
          </form>
        ) : null}

        {stage === 'sent' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
              If an account exists for {email}, we&apos;ve sent a reset link. For this demo,
              continue directly:
            </p>
            <Button onClick={() => setStage('reset')}>Continue to reset form</Button>
          </div>
        ) : null}

        {stage === 'reset' ? (
          <form
            onSubmit={submitNewPassword}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
          >
            <Input
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
              autoComplete="new-password"
            />
            <Button type="submit">Set new password</Button>
          </form>
        ) : null}

        {stage === 'success' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
              Your password has been reset.
            </p>
            <Button onClick={() => navigate('/login')}>Log in</Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
