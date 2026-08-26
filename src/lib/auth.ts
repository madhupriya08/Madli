// Phase 3: real Supabase Auth, replacing src/lib/mockAuth.ts entirely.
//
// Email/password and password reset are fully functional against the live
// project (real supabase.auth calls, verified live — see
// PHASE_3_COMPLETION_REPORT.md §4/§6: real sign-in for all test accounts,
// a real 400 invalid_credentials for a wrong password).
//
// There is no second factor. Signup and login both complete in one step
// with email and password — no OTP, no SMS code, no emailed confirmation
// code standing between someone and the app. The phone/SMS signup path and
// its verifyOtp() step were removed outright rather than hidden, along with
// the SMS-provider configuration that existed only to serve them.
//
// (Password reset still sends an email — that is a recovery flow the person
// asks for by name, not a verification step on the way in, and it stays.)
//
// Google OAuth is wired to the real supabase.auth method below
// (code-complete) but genuinely non-functional until an OAuth client is
// configured on this Supabase project (open since Phase 1, §8). Calling it
// returns the project's real "provider not enabled" error — it is not
// silently faked as working.
import { supabase } from './supabaseClient';

export interface SignupInput {
  email: string;
  password: string;
  /** Shown back to the person as "Welcome back, <name>". Required. */
  name?: string;
}

export function validateSignup(input: SignupInput): string | null {
  if (!input.name || input.name.trim().length < 1) return 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return 'Enter a valid email address.';
  if (input.password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

/**
 * Creates the account and leaves the caller signed in — there is no
 * verification step in between. Supabase returns a session directly here as
 * long as the project does not require email confirmation; if that setting
 * is ever turned on, this returns without a session and the person would be
 * stuck, so it is asserted rather than assumed.
 */
export async function signUp(input: SignupInput): Promise<void> {
  const error = validateSignup(input);
  if (error) throw new Error(error);

  // display_name goes in as user metadata because that is where the existing
  // handle_new_user() trigger reads it from — it inserts the profiles row
  // with `new.raw_user_meta_data ->> 'display_name'`. Passing it here means
  // the profile is named from the moment it exists, with no second write and
  // no window where the app has a signed-in person it cannot greet.
  const { data, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.name?.trim() } },
  });
  if (authError) throw authError;
  if (!data.session) {
    throw new Error(
      'Account created, but this project requires email confirmation. Turn that off in Supabase Auth settings so signup completes in one step.',
    );
  }
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
