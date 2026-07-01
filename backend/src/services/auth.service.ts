import { User } from '../models/User';
import { Student } from '../models/Student';
import { Company } from '../models/Company';
import { hashPassword, comparePassword, hashToken, compareToken } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  signResetToken,
  verifyRefreshToken,
  verifyResetToken,
  buildPayload,
} from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserRole, UserStatus } from '../types';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { sendEmail } from './email.service';
import { attributeReferral } from './referral.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokens(userId: string, role: UserRole, tokenVersion: number): Promise<TokenPair> {
  const accessToken = signAccessToken(buildPayload(userId, role, tokenVersion));
  const refreshToken = signRefreshToken(buildPayload(userId, role, tokenVersion));
  const refreshTokenHash = await hashToken(refreshToken);
  await User.findByIdAndUpdate(userId, { refreshTokenHash });
  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);

  // Create the user, then the role profile. If the profile fails, roll back the
  // user manually. (Avoids requiring a MongoDB replica set for transactions,
  // so this works on a standalone dev instance.)
  const user = await User.create({
    email: input.email,
    passwordHash,
    role: input.role,
    status: UserStatus.ACTIVE,
  });

  try {
    if (input.role === UserRole.STUDENT) {
      await Student.create({ userId: user._id, name: input.name });
    } else {
      await Company.create({ userId: user._id, name: input.name });
    }
  } catch (err) {
    await User.findByIdAndDelete(user._id).catch(() => undefined);
    throw err;
  }

  // V2: best-effort referral attribution (never blocks signup)
  await attributeReferral(user._id, input.referralCode);

  const tokens = await issueTokens(user._id.toString(), user.role, user.tokenVersion);
  return { user: user.toJSON(), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash +tokenVersion');
  if (!user) throw AppError.unauthorized('Invalid email or password');

  const ok = await comparePassword(input.password, user.passwordHash);
  if (!ok) throw AppError.unauthorized('Invalid email or password');

  if (user.status === UserStatus.BANNED || user.status === UserStatus.SUSPENDED) {
    throw AppError.forbidden(`Account is ${user.status}`);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokens(user._id.toString(), user.role, user.tokenVersion);
  return { user: user.toJSON(), ...tokens };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await User.findById(userId).select('+passwordHash +tokenVersion');
  if (!user) throw AppError.notFound('User not found');

  const ok = await comparePassword(currentPassword, user.passwordHash);
  if (!ok) throw AppError.unauthorized('Current password is incorrect');

  user.passwordHash = await hashPassword(newPassword);
  // Invalidate all OTHER sessions; we re-issue below so THIS device stays in.
  user.tokenVersion += 1;
  await user.save();

  return issueTokens(user._id.toString(), user.role, user.tokenVersion);
}

export async function refresh(refreshToken: string) {
  if (!refreshToken) throw AppError.unauthorized('Refresh token missing');

  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub).select('+refreshTokenHash +tokenVersion');
  if (!user || !user.refreshTokenHash) throw AppError.unauthorized('Session expired, please log in again');

  const valid = await compareToken(refreshToken, user.refreshTokenHash);
  if (!valid) {
    // Possible token reuse — revoke all sessions
    user.tokenVersion += 1;
    user.refreshTokenHash = null;
    await user.save();
    throw AppError.unauthorized('Refresh token reuse detected, please log in again');
  }

  if (typeof payload.tokenVersion === 'number' && payload.tokenVersion !== user.tokenVersion) {
    throw AppError.unauthorized('Token has been revoked');
  }

  // Rotate
  const tokens = await issueTokens(user._id.toString(), user.role, user.tokenVersion);
  return tokens;
}

export async function logout(userId: string) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email });
  // Always behave the same to avoid user enumeration
  if (!user) return;

  const resetToken = signResetToken(user._id.toString());
  user.resetPasswordTokenHash = await hashToken(resetToken);
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const resetUrl = `${env.clientUrl.split(',')[0]}/reset-password?token=${resetToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your InternBridge password',
      html: `<p>You requested a password reset.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 15 minutes.</p>
             <p>If you did not request this, you can safely ignore this email.</p>`,
    });
  } catch (err) {
    logger.error('Failed to send reset email', err);
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const payload = verifyResetToken(token);
  const user = await User.findById(payload.sub).select(
    '+resetPasswordTokenHash +resetPasswordExpires +tokenVersion'
  );
  if (!user || !user.resetPasswordTokenHash || !user.resetPasswordExpires) {
    throw AppError.badRequest('Invalid or expired reset token');
  }
  if (user.resetPasswordExpires.getTime() < Date.now()) {
    throw AppError.badRequest('Reset token has expired');
  }

  const matches = await compareToken(token, user.resetPasswordTokenHash);
  if (!matches) throw AppError.badRequest('Invalid reset token');

  user.passwordHash = await hashPassword(newPassword);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpires = null;
  user.refreshTokenHash = null;
  user.tokenVersion += 1; // invalidate all existing sessions
  await user.save();
}
