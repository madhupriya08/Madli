import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { signUp, validateSignup } from '../../lib/auth';
import { useToast } from '../../components/feedback/ToastProvider';

// S11. Name, email and password, one step: creating the account signs you in
// and hands off to the location ask. There is no OTP screen, no SMS code, and
// no phone tab — the whole second-factor surface was removed from the product
// rather than hidden, so nothing here routes to /verify-otp. Google sits below
// as a second path (still awaiting an OAuth client).
//
// The name is collected here and nowhere else. The profiles table has always
// had a display_name column and handle_new_user() has always read it out of
// the signup metadata — this form simply never asked for it, so every account
// was created nameless and the home screen had nothing to greet anyone with.
//
// Signup is also the only place the location prompt is reached from: it is
// shown once, here, on the way in, rather than every time somebody opens a
// door on the home screen.
export function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { show } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSignup({ name, email, password });
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signUp({ name, email, password });
      // Straight into the app: signUp leaves a real session behind it. The
      // location ask comes first and then hands off to the optional ranking
      // step, so a brand-new account has both an origin and a chance to
      // contribute before it ever sees the two doors.
      navigate('/location-permission', { state: { next: '/ranking-onboarding' } });
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
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should we call you?"
          error={error && error.toLowerCase().includes('name') ? error : undefined}
          autoComplete="name"
        />
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
