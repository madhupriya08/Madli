import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { Logo } from '../../components/core/Logo';
import { usePersona } from '../../dev/PersonaContext';
import { login } from '../../lib/auth';
import { logAdminLoginAttempt } from '../../data/admin';

// S41: dark teal, no consumer nav, no logo lockup — switching into Admin
// should feel like leaving the app. Access-denied is separate from
// invalid-credentials: a real account without the role, and the attempt is
// logged, distinctly, either way.
export function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setPersona } = usePersona();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login(email, password);
      if (result.role !== 'admin') {
        await logAdminLoginAttempt(email, 'access_denied', result.userId);
        setError('This account does not have admin access.');
        return;
      }
      setPersona('admin');
      navigate('/admin');
    } catch {
      await logAdminLoginAttempt(email, 'invalid_credentials');
      setError('Invalid email or password.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--teal-900)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--gutter-mobile)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <Logo variant="mark" height={36} style={{ margin: '0 auto var(--space-4)' }} />
        <h1 style={{ font: 'var(--type-h4)', color: 'var(--white)', textAlign: 'center' }}>
          Admin sign-in
        </h1>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            background: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2)',
          }}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          style={{
            background: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2)',
          }}
        />
        <Button type="submit" variant="inverse" block>
          Sign in
        </Button>
      </form>
    </div>
  );
}
