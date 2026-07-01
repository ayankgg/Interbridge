import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptSaltRounds);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash high-entropy opaque tokens (refresh / reset JWTs) with SHA-256 rather
 * than bcrypt. bcrypt silently truncates input to 72 bytes — and JWTs for the
 * same user share a long common prefix — so bcrypt would treat distinct tokens
 * as equal, defeating refresh-token rotation and reuse detection. SHA-256 over
 * the full token avoids that; these tokens are already high-entropy so no salt
 * /work-factor is needed. Kept async to preserve the existing call sites.
 */
export async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function compareToken(token: string, hash: string): Promise<boolean> {
  const computed = crypto.createHash('sha256').update(token).digest('hex');
  const a = Buffer.from(computed);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b); // constant-time comparison
}
