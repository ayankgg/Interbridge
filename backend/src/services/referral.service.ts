import { Types } from 'mongoose';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { AppError } from '../utils/AppError';
import { generateReferralCode } from '../utils/identifiers';
import { ReferralStatus } from '../types';
import { logger } from '../config/logger';

/** Returns the user's referral code, generating one lazily on first request. */
export async function getMyReferral(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');

  if (!user.referralCode) {
    // Retry on the rare unique-collision
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        user.referralCode = generateReferralCode();
        await user.save();
        break;
      } catch (err: unknown) {
        if ((err as { code?: number }).code !== 11000 || attempt === 4) throw err;
      }
    }
  }

  const [total, qualified] = await Promise.all([
    Referral.countDocuments({ referrerId: user._id }),
    Referral.countDocuments({ referrerId: user._id, status: ReferralStatus.QUALIFIED }),
  ]);

  return { referralCode: user.referralCode, stats: { total, qualified } };
}

/**
 * Attributes a new signup to a referrer (called during registration).
 * Best-effort: never blocks registration if attribution fails.
 */
export async function attributeReferral(referredUserId: Types.ObjectId, code?: string): Promise<void> {
  if (!code) return;
  try {
    const referrer = await User.findOne({ referralCode: code }).select('_id');
    if (!referrer || referrer._id.equals(referredUserId)) return; // no self-referral

    // First-write-wins: only attribute if not already attributed, so a retried
    // or duplicate call cannot clobber the original referrer.
    const updated = await User.updateOne(
      { _id: referredUserId, referredBy: null },
      { referredBy: referrer._id }
    );
    if (updated.modifiedCount === 0) return;

    await Referral.create({
      referrerId: referrer._id,
      referredUserId,
      status: ReferralStatus.PENDING,
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code !== 11000) {
      logger.warn('Referral attribution failed', { err });
    }
  }
}
