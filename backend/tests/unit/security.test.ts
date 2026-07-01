import { escapeHtml } from '../../src/utils/sanitize';
import {
  signAccessToken,
  verifyAccessToken,
  signResetToken,
  verifyResetToken,
} from '../../src/utils/jwt';
import { hashPassword, comparePassword } from '../../src/utils/password';
import { UserRole } from '../../src/types';
import { AppError } from '../../src/utils/AppError';

describe('escapeHtml (XSS)', () => {
  it('neutralises a script payload', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;'
    );
  });
  it('handles null/undefined safely', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('JWT', () => {
  it('round-trips an access token payload', () => {
    const token = signAccessToken({ sub: 'u1', role: UserRole.STUDENT, tokenVersion: 0 });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe(UserRole.STUDENT);
  });

  it('rejects a tampered token', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow(AppError);
  });

  it('round-trips a reset token', () => {
    const token = signResetToken('u9');
    expect(verifyResetToken(token).sub).toBe('u9');
  });
});

describe('password hashing', () => {
  it('hashes and verifies a password (and rejects wrong ones)', async () => {
    const hash = await hashPassword('Password123');
    expect(hash).not.toBe('Password123');
    expect(await comparePassword('Password123', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});
