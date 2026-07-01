import { z } from 'zod';

export const issueCertificateSchema = z.object({
  applicationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid application id'),
  title: z.string().min(3).max(160),
  skills: z.array(z.string().min(1)).max(30).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const revokeCertificateSchema = z.object({
  reason: z.string().min(3).max(500),
});

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
