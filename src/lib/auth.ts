// Phase 3: real Supabase Auth, replacing src/lib/mockAuth.ts entirely.
//
// Email/password and password reset are fully functional against the live
// project (real supabase.auth calls, verified live — see
// PHASE_3_COMPLETION_REPORT.md §4/§6: real sign-in for all test accounts,
// a real 400 invalid_credentials for a wrong password).
//
// Phone OTP and Google OAuth are wired to the real supabase.auth methods
// below (code-complete) but genuinely non-functional: no SMS provider or
// Google OAuth client is configured on this Supabase project (open since
// Phase 1, §8). Calling them returns the project's real "provider not
// enabled" error — they are not silently faked as working.
import { supabase } from './supabaseClient';

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

export async function signUp(input: SignupInput): Promise<void> {
  const error = validateSignup(input);
  if (error) throw new Error(error);

  const { error: authError } =
    input.method === 'email'
      ? await supabase.auth.signUp({ email: input.identifier, password: input.password })
      : await supabase.auth.signUp({ phone: input.identifier, password: input.password });
  if (authError) throw authError;
}

export type OtpOutcome = 'correct' | 'wrong' | 'expired';

/** Phone OTP path — non-functional until an SMS provider is configured (see module comment). */
export async function verifyOtp(phone: string, code: string): Promise<OtpOutcome> {
  const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
  if (!error) return 'correct';
  if (error.message.toLowerCase().includes('expired')) return 'expired';
  return 'wrong';
}

export interface LoginResult {
  userId: string;
  role: 'user' | 'admin';
  /** Derived from a verified business_claims row — Owner is not a stored auth role. */
  hasVerifiedClaim: boolean;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Invalid email or password.');

  const userId = data.user.id;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;

  const { data: claims, error: claimsError } = await supabase
    .from('business_claims')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'verified')
    .limit(1);
  if (claimsError) throw claimsError;

  return {
    userId,
    role: profile.role as 'user' | 'admin',
    hasVerifiedClaim: (claims?.length ?? 0) > 0,
  };
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function resetPassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Google OAuth path — non-functional until an OAuth client is configured (see module comment). */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
}
