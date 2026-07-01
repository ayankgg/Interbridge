import { z } from 'zod';
import { ApplicationStatus } from '../types';

export const applySchema = z.object({
  coverLetter: z.string().max(3000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    ApplicationStatus.PENDING,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.HIRED,
  ]),
  note: z.string().max(1000).optional(),
});

export const addNoteSchema = z.object({
  text: z.string().min(1).max(1000),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
