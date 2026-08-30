import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { login } from '../../lib/auth';
import { usePersona } from '../../dev/PersonaContext';

// S13: consumer login only — Admin never touches this screen (S41 is a
// separate surface). Login also runs through S8 (`/area`) before landing —
// sessionStorage is per-tab, so even a returning account may have no chosen
// area yet this session, and a door tap on Home assumes one always exists.
export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setPersona } = usePersona();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      // Consumer login never grants admin, even for a real admin account —
      // S41 is a separate surface.
      setPersona('user');
      // Through '/area' rather than straight to '/app': routing there
      // directly (instead of through '/', which reads hasSession) avoids
      // depending on whether onAuthStateChange has propagated by the time
      // this line runs — and '/area' is now the required stop before Home
      // anyway.
      navigate('/area', { state: { next: '/app' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Log in" onBack={() => navigate(-1)} showTabBar={false}>
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
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          autoComplete="current-password"
        />
        <Button type="submit" size="lg" block disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
        <p style={{ font: 'var(--type-caption)', textAlign: 'center' }}>
          <a href="/forgot-password">Forgot your password?</a>
        </p>
      </form>
    </AppShell>
  );
}
