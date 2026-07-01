import { z } from 'zod';
import { Proficiency, InternshipStatus } from '../types';

const requiredSkill = z.object({
  skillId: z.string().min(1),
  name: z.string().min(1),
  weight: z.number().min(0.1).max(5).optional(),
  minProficiency: z.nativeEnum(Proficiency).optional(),
});

export const createInternshipSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(20).max(8000),
  role: z.string().max(120).optional(),
  requiredSkills: z.array(requiredSkill).min(1, 'At least one required skill'),
  niceToHaveSkills: z
    .array(z.object({ skillId: z.string(), name: z.string() }))
    .optional(),
  eligibility: z
    .object({
      minYear: z.number().int().min(1).max(6).optional(),
      maxYear: z.number().int().min(1).max(6).optional(),
    })
    .optional(),
  location: z
    .object({ city: z.string().optional(), remoteOk: z.boolean().optional() })
    .optional(),
  stipend: z
    .object({
      amount: z.number().min(0).optional(),
      currency: z.string().optional(),
      period: z.string().optional(),
    })
    .optional(),
  duration: z.string().optional(),
  openings: z.number().int().min(1).optional(),
  deadline: z.coerce.date().optional(),
  status: z.enum([InternshipStatus.DRAFT, InternshipStatus.ACTIVE]).optional(),
});

export const updateInternshipSchema = createInternshipSchema.partial().extend({
  status: z.nativeEnum(InternshipStatus).optional(),
});

export const listInternshipQuerySchema = z.object({
  q: z.string().optional(),
  skills: z.string().optional(), // comma separated skillIds
  city: z.string().optional(),
  remote: z.enum(['true', 'false']).optional(),
  minStipend: z.coerce.number().optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  company: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(['relevance', 'recent', 'stipend']).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export type CreateInternshipInput = z.infer<typeof createInternshipSchema>;
export type UpdateInternshipInput = z.infer<typeof updateInternshipSchema>;
