import { z } from 'zod';
import { InterviewMode, InterviewStatus } from '../types';

export const createInterviewSchema = z
  .object({
    applicationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid application id'),
    mode: z.nativeEnum(InterviewMode),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    meetingLink: z.string().url().optional(),
    location: z.string().max(300).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.endAt > d.startAt, { message: 'endAt must be after startAt', path: ['endAt'] })
  .refine((d) => d.startAt.getTime() > Date.now(), {
    message: 'startAt must be in the future',
    path: ['startAt'],
  });

export const updateInterviewSchema = z.object({
  status: z
    .enum([InterviewStatus.RESCHEDULED, InterviewStatus.COMPLETED, InterviewStatus.CANCELLED])
    .optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  meetingLink: z.string().url().optional(),
  location: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
