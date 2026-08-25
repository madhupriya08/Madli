// validateSignup is pure, client-side validation. login/signUp make real
// network calls and were verified live instead (all 3 test accounts signed
// in for real, plus a real invalid_credentials rejection — see
// PHASE_3_COMPLETION_REPORT.md §6).
//
// The phone-number cases that used to live here are gone with the phone
// signup path itself: Madli has no SMS auth, so there is no phone identifier
// left to validate.
import { describe, it, expect } from 'vitest';
import { validateSignup } from './auth';

describe('validateSignup', () => {
  it('rejects a malformed email', () => {
    expect(validateSignup({ email: 'not-an-email', password: 'longenough' })).toBe(
      'Enter a valid email address.',
    );
  });

  it('accepts a well-formed email with a long-enough password', () => {
    expect(validateSignup({ email: 'person@example.com', password: 'longenough' })).toBeNull();
  });

  it('rejects a password shorter than 8 characters even with a valid email', () => {
    expect(validateSignup({ email: 'person@example.com', password: 'short' })).toBe(
      'Password must be at least 8 characters.',
    );
  });
});
