import { z } from 'zod';
import { Proficiency } from '../types';

export const updateStudentSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  headline: z.string().max(160).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\-\s\d]{7,20}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dateOfBirth: z.coerce.date().optional(),
  bio: z.string().max(2000).optional(),
  yearOfStudy: z.number().int().min(1).max(6).optional(),
  college: z.string().max(160).optional(),
  location: z
    .object({
      city: z.string().optional(),
      country: z.string().optional(),
      remoteOk: z.boolean().optional(),
    })
    .optional(),
  links: z
    .object({
      github: z.string().url().optional().or(z.literal('')),
      portfolio: z.string().url().optional().or(z.literal('')),
      linkedin: z.string().url().optional().or(z.literal('')),
    })
    .optional(),
  jobSeekingStatus: z.enum(['active', 'passive', 'closed']).optional(),
  skills: z
    .array(
      z.object({
        skillId: z.string().min(1),
        name: z.string().min(1),
        proficiency: z.nativeEnum(Proficiency).optional(),
        selfRating: z.number().min(1).max(5).optional(),
      })
    )
    .optional(),
  education: z
    .array(
      z.object({
        degree: z.string().min(1),
        college: z.string().min(1),
        startYear: z.number().int().optional(),
        endYear: z.number().int().optional(),
        gpa: z.number().min(0).max(10).optional(),
      })
    )
    .optional(),
  projects: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().max(2000).optional(),
        techStack: z.array(z.string()).optional(),
        link: z.string().url().optional().or(z.literal('')),
      })
    )
    .optional(),
  certifications: z
    .array(
      z.object({
        name: z.string().min(1),
        issuer: z.string().optional(),
        url: z.string().url().optional().or(z.literal('')),
        date: z.coerce.date().optional(),
      })
    )
    .optional(),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
