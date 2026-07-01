import jwt, { SignOptions, Algorithm } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types';
import { AppError } from './AppError';

const ALGO: Algorithm = 'HS256';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
    algorithm: ALGO,
  } as SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
    algorithm: ALGO,
  } as SignOptions);
}

export function signResetToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: 'reset' }, env.jwt.resetSecret, {
    expiresIn: env.jwt.resetExpiresIn,
    algorithm: ALGO,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.jwt.accessSecret, { algorithms: [ALGO] }) as JwtPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.jwt.refreshSecret, { algorithms: [ALGO] }) as JwtPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
}

export function verifyResetToken(token: string): { sub: string } {
  try {
    const decoded = jwt.verify(token, env.jwt.resetSecret, { algorithms: [ALGO] }) as {
      sub: string;
      purpose?: string;
    };
    // Enforce the token-type claim so a token minted for another purpose
    // (but with a shared secret) cannot be replayed against the reset flow.
    if (decoded.purpose !== 'reset') {
      throw AppError.badRequest('Invalid reset token');
    }
    return { sub: decoded.sub };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.badRequest('Invalid or expired reset token');
  }
}

export function buildPayload(userId: string, role: UserRole, tokenVersion: number): JwtPayload {
  return { sub: userId, role, tokenVersion };
}
