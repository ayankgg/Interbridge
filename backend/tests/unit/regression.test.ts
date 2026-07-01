import { computeMatch } from '../../src/utils/matching';
import { hashToken, compareToken } from '../../src/utils/password';
import { signAccessToken, verifyResetToken, signResetToken } from '../../src/utils/jwt';
import { UserRole } from '../../src/types';
import { AppError } from '../../src/utils/AppError';

describe('regression: matching with zero required skills', () => {
  it('does not award a high score to everyone for a no-requirements internship', () => {
    const internship = { requiredSkills: [], eligibility: {} } as never;
    const result = computeMatch({ skills: [], projects: [], yearOfStudy: 2 } as never, internship);
    // Previously this returned ~85 (coverage/fit defaulted to 1). Now neutral.
    expect(result.score).toBeLessThanOrEqual(55);
    expect(result.skillCoverage).toBe(50);
    expect(result.proficiencyFit).toBe(50);
  });
});

describe('regression: opaque-token hashing (bcrypt 72-byte truncation fix)', () => {
  it('produces a 64-char SHA-256 hex digest', async () => {
    const hash = await hashToken('some.jwt.like.token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('distinguishes tokens that share the first 72 bytes (bcrypt would not)', async () => {
    const shared = 'A'.repeat(72);
    const hashA = await hashToken(`${shared}X`);
    // The two tokens differ only AFTER byte 72 — bcrypt truncates and would match.
    expect(await compareToken(`${shared}Y`, hashA)).toBe(false);
    expect(await compareToken(`${shared}X`, hashA)).toBe(true);
  });
});

describe('regression: reset-token purpose + algorithm enforcement', () => {
  it('rejects an access token presented to the reset verifier', () => {
    const access = signAccessToken({ sub: 'u1', role: UserRole.STUDENT, tokenVersion: 0 });
    expect(() => verifyResetToken(access)).toThrow(AppError);
  });

  it('accepts a genuine reset token and returns the subject', () => {
    const token = signResetToken('u42');
    expect(verifyResetToken(token).sub).toBe('u42');
  });
});
