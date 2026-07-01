import { Types } from 'mongoose';
import { getGeminiModel, isGeminiEnabled } from '../config/gemini';
import { Student } from '../models/Student';
import { Internship } from '../models/Internship';
import { Application } from '../models/Application';
import { AppError } from '../utils/AppError';
import { computeMatch } from '../utils/matching';
import { InternshipStatus } from '../types';
import { logger } from '../config/logger';

const GEMINI_TIMEOUT_MS = 8000;
const GEMINI_MAX_ATTEMPTS = 2;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Gemini request timed out')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Strip markdown code fences the model sometimes wraps JSON in. */
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

/**
 * Safely run a Gemini JSON prompt with a hard timeout and one retry on
 * transient failures. Returns null on any persistent failure so callers can
 * fall back to deterministic logic (graceful degradation). Never throws.
 */
async function runGemini<T>(prompt: string): Promise<T | null> {
  const model = getGeminiModel();
  if (!model) return null;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS);
      const text = stripFences(result.response.text());
      return JSON.parse(text) as T;
    } catch (err) {
      const message = (err as Error).message;
      logger.warn(`Gemini call failed (attempt ${attempt}/${GEMINI_MAX_ATTEMPTS})`, { message });
      if (attempt < GEMINI_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * attempt)); // small backoff
      }
    }
  }
  return null;
}

/* ---------------- 1. Resume Match Score ---------------- */
export async function getMatchScore(userId: string, internshipId: string) {
  if (!Types.ObjectId.isValid(internshipId)) throw AppError.badRequest('Invalid internship id');

  const [student, internship] = await Promise.all([
    Student.findOne({ userId }),
    Internship.findById(internshipId),
  ]);
  if (!student) throw AppError.notFound('Student profile not found');
  if (!internship) throw AppError.notFound('Internship not found');

  const deterministic = computeMatch(student, internship);

  // Enrich with an AI-written explanation when available
  let aiInsight: { summary?: string; suggestions?: string[] } | null = null;
  if (isGeminiEnabled()) {
    const prompt = `You are an internship matching assistant. Given the candidate and the internship, return STRICT JSON: {"summary": string (max 2 sentences), "suggestions": string[] (max 3 actionable tips)}.
Candidate skills: ${JSON.stringify(student.skills.map((s) => `${s.name}(${s.proficiency})`))}
Candidate projects: ${JSON.stringify(student.projects.map((p) => p.title))}
Year of study: ${student.yearOfStudy ?? 'unknown'}
Internship: ${internship.title}
Required skills: ${JSON.stringify(internship.requiredSkills.map((s) => s.name))}
Deterministic score: ${deterministic.score}, missing: ${JSON.stringify(deterministic.missingSkills)}.`;
    aiInsight = await runGemini(prompt);
  }

  return {
    score: deterministic.score,
    breakdown: deterministic,
    insight:
      aiInsight ?? {
        summary: `You match ${deterministic.score}% based on skills and project relevance.`,
        suggestions: deterministic.missingSkills.slice(0, 3).map((s) => `Learn ${s} to improve your fit`),
      },
  };
}

/* ---------------- 2. Skill Gap Analyzer ---------------- */
export async function getSkillGap(userId: string, options: { role?: string; internshipId?: string }) {
  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');

  const studentSkillKeys = new Set(
    student.skills.map((s) => (s.skillId || s.name).toLowerCase())
  );

  // Aggregate demanded skills, either for a specific internship or across the market
  const matchStage: Record<string, unknown> = { status: InternshipStatus.ACTIVE };
  if (options.internshipId && Types.ObjectId.isValid(options.internshipId)) {
    matchStage._id = new Types.ObjectId(options.internshipId);
  } else if (options.role) {
    matchStage.$text = { $search: options.role };
  }

  const demand = await Internship.aggregate([
    { $match: matchStage },
    { $unwind: '$requiredSkills' },
    {
      $group: {
        _id: { $toLower: '$requiredSkills.skillId' },
        name: { $first: '$requiredSkills.name' },
        frequency: { $sum: 1 },
        avgWeight: { $avg: '$requiredSkills.weight' },
      },
    },
    { $sort: { frequency: -1 } },
    { $limit: 50 },
  ]);

  const gaps = demand
    .filter((d) => !studentSkillKeys.has(String(d._id)))
    .map((d) => ({
      skillId: d._id,
      name: d.name,
      demandFrequency: d.frequency,
      priorityScore: Math.round(d.frequency * (d.avgWeight ?? 1)),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 15);

  // AI-generated learning path (optional)
  let learningPath: unknown = null;
  if (isGeminiEnabled() && gaps.length) {
    const prompt = `Return STRICT JSON: {"path": [{"skill": string, "why": string, "estimatedWeeks": number, "resources": string[]}]}.
Create a prioritized learning plan for a ${student.yearOfStudy ?? 'early-year'}-year student to close these skill gaps (most in-demand first): ${JSON.stringify(
      gaps.slice(0, 6).map((g) => g.name)
    )}.`;
    const ai = await runGemini<{ path: unknown }>(prompt);
    learningPath = ai?.path ?? null;
  }

  return {
    currentSkills: student.skills.map((s) => s.name),
    gaps,
    learningPath,
    source: options.internshipId ? 'internship' : options.role ? 'role' : 'market',
  };
}

/* ---------------- 3. Internship Recommendation Engine ---------------- */
export async function getRecommendations(userId: string, limit = 10) {
  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');

  const skillKeys = student.skills.map((s) => (s.skillId || s.name).toLowerCase());

  // Candidate set: active internships matching at least one skill, eligibility-aware
  const candidateFilter: Record<string, unknown> = { status: InternshipStatus.ACTIVE };
  if (skillKeys.length) candidateFilter['requiredSkills.skillId'] = { $in: skillKeys };
  if (student.yearOfStudy) {
    candidateFilter.$and = [
      { $or: [{ 'eligibility.minYear': { $exists: false } }, { 'eligibility.minYear': { $lte: student.yearOfStudy } }] },
      { $or: [{ 'eligibility.maxYear': { $exists: false } }, { 'eligibility.maxYear': { $gte: student.yearOfStudy } }] },
    ];
  }

  // Exclude already-applied internships
  const applied = await Application.find({ studentId: student._id }).distinct('internshipId');

  const candidates = await Internship.find({
    ...candidateFilter,
    _id: { $nin: applied },
  })
    .limit(100)
    .populate('companyId', 'name logoUrl')
    .lean();

  const ranked = candidates
    .map((internship) => {
      const match = computeMatch(student, internship as never);
      return {
        internship: {
          id: internship._id,
          title: internship.title,
          company: internship.companyId,
          location: internship.location,
          stipend: internship.stipend,
          deadline: internship.deadline,
        },
        matchScore: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        reason: match.matchedSkills.length
          ? `Matches your skills: ${match.matchedSkills.slice(0, 3).join(', ')}`
          : 'Recommended based on your profile',
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return {
    recommendations: ranked,
    profileCompleteness: student.profileCompleteness,
    note: student.profileCompleteness < 50
      ? 'Complete your profile to get better recommendations'
      : undefined,
  };
}

/* ---------------- 4. Candidate Recommendation Engine (company) ---------------- */
export async function getCandidateRecommendations(internshipId: string, limit = 20) {
  if (!Types.ObjectId.isValid(internshipId)) throw AppError.badRequest('Invalid internship id');
  const internship = await Internship.findById(internshipId);
  if (!internship) throw AppError.notFound('Internship not found');

  const skillKeys = internship.requiredSkills.map((s) => (s.skillId || s.name).toLowerCase());

  const candidates = await Student.find({
    jobSeekingStatus: 'active',
    'consent.candidateDiscovery': true,
    ...(skillKeys.length ? { 'skills.skillId': { $in: skillKeys } } : {}),
  })
    .limit(200)
    .lean();

  const ranked = candidates
    .map((student) => {
      const match = computeMatch(student as never, internship);
      return {
        student: {
          id: student._id,
          name: student.name,
          headline: student.headline,
          yearOfStudy: student.yearOfStudy,
          topSkills: student.skills.slice(0, 5).map((s) => s.name),
        },
        matchScore: match.score,
        matchedSkills: match.matchedSkills,
      };
    })
    .filter((c) => c.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return { candidates: ranked };
}

/* ---------------- 5. Resume Feedback ---------------- */
export async function getResumeFeedback(userId: string, targetRole?: string) {
  const student = await Student.findOne({ userId }).select('+resume.parsedText');
  if (!student) throw AppError.notFound('Student profile not found');

  // Rule-based baseline feedback
  const issues: string[] = [];
  if (!student.headline) issues.push('Add a professional headline');
  if (!student.skills.length) issues.push('Add at least 3 relevant skills');
  if (!student.projects.length) issues.push('Add projects to showcase practical experience');
  if (!student.education.length) issues.push('Add your education details');
  if (!student.resume?.fileUrl) issues.push('Upload a resume file');
  if (!student.links?.github && !student.links?.portfolio) {
    issues.push('Add a GitHub or portfolio link');
  }

  let aiFeedback: unknown = null;
  if (isGeminiEnabled()) {
    const prompt = `Return STRICT JSON: {"overallScore": number(0-100), "strengths": string[], "improvements": string[], "atsTips": string[]}.
Review this student profile for internship readiness${targetRole ? ` targeting a ${targetRole} role` : ''}.
Headline: ${student.headline ?? 'none'}
Skills: ${JSON.stringify(student.skills.map((s) => s.name))}
Projects: ${JSON.stringify(student.projects.map((p) => ({ title: p.title, tech: p.techStack })))}
Education: ${JSON.stringify(student.education.map((e) => e.degree))}`;
    aiFeedback = await runGemini(prompt);
  }

  return {
    ruleBasedIssues: issues,
    baseScore: Math.max(0, 100 - issues.length * 12),
    aiFeedback,
  };
}
