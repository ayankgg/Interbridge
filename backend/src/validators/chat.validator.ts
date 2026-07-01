import { z } from 'zod';

export const startConversationSchema = z.object({
  // The company starts from an applicant; the student starts from an internship.
  internshipId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  studentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  applicationId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message cannot be empty').max(5000),
  attachments: z
    .array(z.object({ url: z.string().url(), name: z.string().max(200) }))
    .max(5)
    .optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
