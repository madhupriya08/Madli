import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { signUp, validateSignup } from '../../lib/auth';
import { useToast } from '../../components/feedback/ToastProvider';

// S11. Email and password, one step: creating the account signs you in and
// drops you straight into ranking onboarding. There is no OTP screen, no SMS
// code, and no phone tab — the whole second-factor surface was removed from
// the product rather than hidden, so nothing here routes to /verify-otp.
// Google sits below as a second path (still awaiting an OAuth client).
export function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { show } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSignup({ email, password });
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signUp({ email, password });
      // Straight into the app: signUp leaves a real session behind it.
      navigate('/ranking-onboarding');
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
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          maxWidth: 420,
        }}
      >
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={error && error.toLowerCase().includes('email') ? error : undefined}
          autoComplete="email"
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
