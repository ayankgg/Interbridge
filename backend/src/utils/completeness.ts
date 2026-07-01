import { IStudent } from '../models/Student';

/**
 * Computes a 0-100 profile completeness score used to nudge students
 * and to gate recommendation eligibility.
 */
export function computeCompleteness(student: IStudent): number {
  let score = 0;
  if (student.name) score += 10;
  if (student.headline) score += 10;
  if (student.bio) score += 5;
  if (student.yearOfStudy) score += 5;
  if (student.college) score += 5;
  if (student.location?.city) score += 5;
  if (student.skills?.length >= 3) score += 20;
  else if (student.skills?.length) score += 10;
  if (student.education?.length) score += 10;
  if (student.projects?.length >= 1) score += 15;
  if (student.certifications?.length) score += 5;
  if (student.resume?.fileUrl) score += 10;
  return Math.min(100, score);
}
