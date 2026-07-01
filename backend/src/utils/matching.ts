import { IStudent } from '../models/Student';
import { IInternship } from '../models/Internship';
import { Proficiency } from '../types';

const PROFICIENCY_RANK: Record<string, number> = {
  [Proficiency.BEGINNER]: 1,
  [Proficiency.INTERMEDIATE]: 2,
  [Proficiency.ADVANCED]: 3,
};

export interface MatchBreakdown {
  score: number;
  skillCoverage: number;
  proficiencyFit: number;
  projectRelevance: number;
  eligibility: number;
  matchedSkills: string[];
  missingSkills: string[];
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[.\s_-]+/g, '');
}

/**
 * Deterministic, explainable resume↔internship match score (0-100).
 * Rewards relevant projects so beginners with strong projects can out-rank
 * credentialed-but-irrelevant candidates — the core InternBridge thesis.
 */
export function computeMatch(student: Pick<IStudent, 'skills' | 'projects' | 'yearOfStudy'>, internship: Pick<IInternship, 'requiredSkills' | 'eligibility'>): MatchBreakdown {
  const required = internship.requiredSkills ?? [];

  const studentSkillMap = new Map<string, number>();
  for (const s of student.skills ?? []) {
    studentSkillMap.set(norm(s.skillId || s.name), PROFICIENCY_RANK[s.proficiency] ?? 1);
  }

  const projectTech = new Set<string>();
  for (const p of student.projects ?? []) {
    for (const t of p.techStack ?? []) projectTech.add(norm(t));
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  let totalWeight = 0;
  let coveredWeight = 0;
  let proficiencyPoints = 0;
  let proficiencyMax = 0;

  for (const req of required) {
    const key = norm(req.skillId || req.name);
    const weight = req.weight ?? 1;
    totalWeight += weight;
    proficiencyMax += weight;

    const studentRank = studentSkillMap.get(key);
    if (studentRank !== undefined) {
      coveredWeight += weight;
      matchedSkills.push(req.name);
      const requiredRank = PROFICIENCY_RANK[req.minProficiency] ?? 1;
      const fit = Math.min(1, studentRank / requiredRank);
      proficiencyPoints += weight * fit;
    } else {
      missingSkills.push(req.name);
    }
  }

  // An internship with NO required skills carries no skill signal — treat
  // coverage/fit as neutral (0.5) rather than perfect (1), so it doesn't score
  // ~85 for every candidate regardless of fit.
  const hasRequirements = totalWeight > 0;
  const skillCoverage = hasRequirements ? coveredWeight / totalWeight : 0.5;
  const proficiencyFit = proficiencyMax > 0 ? proficiencyPoints / proficiencyMax : 0.5;

  // Project relevance: fraction of required skills demonstrated via projects
  let projHits = 0;
  for (const req of required) {
    if (projectTech.has(norm(req.skillId || req.name))) projHits += 1;
  }
  const projectRelevance = required.length > 0 ? projHits / required.length : 0;

  // Eligibility (soft): 1 if within range, 0.5 otherwise
  let eligibility = 1;
  const { minYear, maxYear } = internship.eligibility ?? {};
  const year = student.yearOfStudy;
  if (typeof year === 'number') {
    if (typeof minYear === 'number' && year < minYear) eligibility = 0.5;
    if (typeof maxYear === 'number' && year > maxYear) eligibility = 0.5;
  }

  const score = Math.round(
    100 *
      (0.55 * skillCoverage +
        0.2 * proficiencyFit +
        0.15 * projectRelevance +
        0.1 * eligibility)
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    skillCoverage: Math.round(skillCoverage * 100),
    proficiencyFit: Math.round(proficiencyFit * 100),
    projectRelevance: Math.round(projectRelevance * 100),
    eligibility: Math.round(eligibility * 100),
    matchedSkills,
    missingSkills,
  };
}
