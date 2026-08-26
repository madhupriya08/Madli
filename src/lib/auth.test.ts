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

const valid = { name: 'Priya', email: 'person@example.com', password: 'longenough' };

describe('validateSignup', () => {
  it('rejects a malformed email', () => {
    expect(validateSignup({ ...valid, email: 'not-an-email' })).toBe(
      'Enter a valid email address.',
    );
  });

  it('accepts a well-formed email with a long-enough password', () => {
    expect(validateSignup(valid)).toBeNull();
  });

  it('rejects a password shorter than 8 characters even with a valid email', () => {
    expect(validateSignup({ ...valid, password: 'short' })).toBe(
      'Password must be at least 8 characters.',
    );
  });

  // The name is what the home screen greets people by. Without it every
  // account is created nameless and there is nothing to greet them with, so
  // it is validated rather than quietly accepted as empty.
  it('rejects a missing name', () => {
    expect(validateSignup({ email: 'person@example.com', password: 'longenough' })).toBe(
      'Enter your name.',
    );
  });

  it('rejects a name that is only whitespace', () => {
    expect(validateSignup({ ...valid, name: '   ' })).toBe('Enter your name.');
  });
});
