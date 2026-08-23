// Phase 3: validateSignup is still pure, client-side validation — the only
// part of the old mockAuth test suite that stays a real unit test after the
// swap to real supabase.auth calls. login/verifyOtp/signUp now make real
// network calls; those were verified live instead (all 3 test accounts
// signed in for real, plus a real invalid_credentials rejection — see
// PHASE_3_COMPLETION_REPORT.md §6) and are exercised by the Playwright suite.
import { describe, it, expect } from 'vitest';
import { validateSignup } from './auth';

describe('validateSignup', () => {
  it('rejects a malformed email', () => {
    expect(validateSignup({ method: 'email', identifier: 'not-an-email', password: 'longenough' })).toBe(
      'Enter a valid email address.',
    );
  });

  it('accepts a well-formed email with a long-enough password', () => {
    expect(
      validateSignup({ method: 'email', identifier: 'person@example.com', password: 'longenough' }),
    ).toBeNull();
  });

  it('rejects a malformed phone number', () => {
    expect(validateSignup({ method: 'phone', identifier: '12345', password: 'longenough' })).toBe(
      'Enter a valid phone number.',
    );
  });

  it('accepts a well-formed Indian phone number', () => {
    expect(
      validateSignup({ method: 'phone', identifier: '+91 98765 43210', password: 'longenough' }),
    ).toBeNull();
  });

  it('rejects a password shorter than 8 characters even with a valid email', () => {
    expect(validateSignup({ method: 'email', identifier: 'person@example.com', password: 'short' })).toBe(
      'Password must be at least 8 characters.',
    );
  });
});
