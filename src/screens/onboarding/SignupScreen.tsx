import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tabs } from '../../components/navigation/Tabs';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { signUp, validateSignup, type SignupInput } from '../../lib/auth';
import { useToast } from '../../components/feedback/ToastProvider';

// S11: phone and email are a segmented toggle, not two forms; Google sits
// below both as a third path. The carry-over line names the place a guest
// logged if they arrive mid-log (not modeled here — no guest mid-log state
// is threaded through routing in this mock).
export function SignupScreen() {
  const [method, setMethod] = useState<SignupInput['method']>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { show } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSignup({ method, identifier, password });
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signUp({ method, identifier, password });
      navigate('/verify-otp', { state: { method, identifier } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Create your account" onBack={() => navigate(-1)} showTabBar={false}>
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          padding: 'var(--space-6) var(--gutter-mobile)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          maxWidth: 420,
        }}
      >
        <Tabs
          items={[
            { value: 'email', label: 'Email' },
            { value: 'phone', label: 'Phone' },
          ]}
          value={method}
          onChange={(v) => setMethod(v as SignupInput['method'])}
        />
        <Input
          label={method === 'email' ? 'Email' : 'Phone number'}
          type={method === 'email' ? 'email' : 'tel'}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={method === 'email' ? 'you@example.com' : '+91 98765 43210'}
          error={
            error && error.toLowerCase().includes(method === 'email' ? 'email' : 'phone')
              ? error
              : undefined
          }
          autoComplete={method === 'email' ? 'email' : 'tel'}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          error={error && error.toLowerCase().includes('password') ? error : undefined}
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" block disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          block
          onClick={() => show('Google sign-in is mocked in Phase 2.')}
        >
          Continue with Google
        </Button>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', textAlign: 'center' }}>
          Already have an account? <a href="/login">Log in</a>
        </p>
      </form>
    </AppShell>
  );
}
