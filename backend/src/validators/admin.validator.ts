import { z } from 'zod';
import { UserStatus, VerificationStatus } from '../types';

export const verifyCompanySchema = z.object({
  decision: z.enum([VerificationStatus.VERIFIED, VerificationStatus.REJECTED]),
  reason: z.string().max(500).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.BANNED]),
  reason: z.string().max(500).optional(),
});
