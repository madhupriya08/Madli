import { describe, it, expect } from 'vitest';
import { validateSignup, mockVerifyOtp, mockLogin } from './mockAuth';

describe('validateSignup', () => {
  it('rejects a malformed email', () => {
    expect(
      validateSignup({ method: 'email', identifier: 'not-an-email', password: 'longenough' }),
    ).toBe('Enter a valid email address.');
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
    expect(
      validateSignup({ method: 'email', identifier: 'person@example.com', password: 'short' }),
    ).toBe('Password must be at least 8 characters.');
  });
});

describe('mockVerifyOtp', () => {
  it('reports the correct code as correct', async () => {
    expect(await mockVerifyOtp('123456')).toBe('correct');
  });
  it('reports the dev "000000" convenience code as wrong', async () => {
    expect(await mockVerifyOtp('000000')).toBe('wrong');
  });
  it('reports the dev "999999" convenience code as expired', async () => {
    expect(await mockVerifyOtp('999999')).toBe('expired');
  });
});

describe('mockLogin', () => {
  it('rejects an unknown identifier', async () => {
    await expect(mockLogin('nobody@dev.madli.test', 'password')).rejects.toThrow(
      'Invalid email or password.',
    );
  });

  it('rejects a known identifier with too short a password', async () => {
    await expect(mockLogin('user.test@dev.madli.test', 'abc')).rejects.toThrow(
      'Invalid email or password.',
    );
  });

  it('logs in a known test account with a valid password', async () => {
    const result = await mockLogin('user.test@dev.madli.test', 'password123');
    expect(result.role).toBe('user');
  });
});
