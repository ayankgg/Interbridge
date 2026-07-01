import crypto from 'crypto';

/** URL-safe slug from a display name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');
}

/** Short random suffix to resolve slug collisions deterministically-enough. */
export function shortToken(bytes = 4): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Unguessable public referral code, e.g. "IB-9F3A2C". */
export function generateReferralCode(): string {
  return `IB-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Unguessable public certificate id, e.g. "CERT-3F9A1B7C2D4E". */
export function generateCertificateId(): string {
  return `CERT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}
