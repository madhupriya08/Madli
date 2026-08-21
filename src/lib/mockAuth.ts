// Mock auth layer (§4 of the Phase 2 prompt: build every state, wire NO real
// calls). Simulates just enough validation/state transition to make S6-S14
// and S41 genuinely interactive and testable, without ever touching Supabase
// Auth. Phase 3 replaces every function here with the matching
// `supabase.auth.*` call — same names, same shapes, so screens don't change.
import { MOCK_USER_ID, MOCK_OWNER_ID, MOCK_ADMIN_ID } from '../dev/PersonaContext';

const KNOWN_ACCOUNTS: Record<string, { userId: string; role: 'user' | 'owner' | 'admin' }> = {
  'user.test@dev.madli.test': { userId: MOCK_USER_ID, role: 'user' },
  'owner.test@dev.madli.test': { userId: MOCK_OWNER_ID, role: 'owner' },
  'admin.superadmin@dev.madli.test': { userId: MOCK_ADMIN_ID, role: 'admin' },
};

export const MOCK_OTP_CODE = '123456';

export interface MockLoginResult {
  userId: string;
  role: 'user' | 'owner' | 'admin';
}

export async function mockLogin(identifier: string, password: string): Promise<MockLoginResult> {
  await delay();
  const account = KNOWN_ACCOUNTS[identifier.trim().toLowerCase()];
  if (!account || password.length < 4) {
    throw new Error('Invalid email or password.');
  }
  return account;
}

export interface SignupInput {
  method: 'email' | 'phone';
  identifier: string;
  password: string;
}

export function validateSignup(input: SignupInput): string | null {
  if (input.method === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.identifier)) return 'Enter a valid email address.';
  } else {
    if (!/^\+?[0-9]{10,13}$/.test(input.identifier.replace(/\s/g, '')))
      return 'Enter a valid phone number.';
  }
  if (input.password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

export async function mockSignUp(input: SignupInput): Promise<void> {
  await delay();
  const error = validateSignup(input);
  if (error) throw new Error(error);
}

export type OtpOutcome = 'correct' | 'wrong' | 'expired';

/** Dev convenience: entering "000000" simulates wrong-code, "999999" simulates expired. */
export async function mockVerifyOtp(code: string): Promise<OtpOutcome> {
  await delay();
  if (code === '999999') return 'expired';
  if (code !== MOCK_OTP_CODE) return 'wrong';
  return 'correct';
}

export async function mockRequestPasswordReset(email: string): Promise<void> {
  await delay();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
}

export async function mockResetPassword(newPassword: string): Promise<void> {
  await delay();
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
}

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
