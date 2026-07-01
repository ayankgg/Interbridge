import { z } from 'zod';
import { ReportTargetType, ReportReason, ReportStatus } from '../types';

export const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid target id'),
  reason: z.nativeEnum(ReportReason),
  description: z.string().max(2000).optional(),
});

export const handleReportSchema = z.object({
  status: z.enum([ReportStatus.REVIEWING, ReportStatus.RESOLVED, ReportStatus.DISMISSED]),
  resolution: z.string().max(2000).optional(),
  action: z.enum(['none', 'remove_internship', 'suspend_user', 'ban_user']).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type HandleReportInput = z.infer<typeof handleReportSchema>;
