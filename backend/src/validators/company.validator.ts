import { z } from 'zod';

export const updateCompanySchema = z.object({
  name: z.string().min(2).max(160).optional(),
  description: z.string().max(4000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().max(120).optional(),
  size: z.string().max(60).optional(),
  location: z
    .object({ city: z.string().optional(), country: z.string().optional() })
    .optional(),
});

export const submitVerificationSchema = z.object({
  docs: z
    .array(z.object({ name: z.string().min(1), url: z.string().url() }))
    .min(1, 'At least one document is required'),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
