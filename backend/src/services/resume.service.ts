import { Types } from 'mongoose';
import { ResumeVersion, IResumeVersion } from '../models/ResumeVersion';
import { Student } from '../models/Student';
import { Internship } from '../models/Internship';
import { AppError } from '../utils/AppError';
import { uploadBuffer, deleteAsset } from '../utils/cloudinaryUpload';
import { parseResume, extractUrls } from '../utils/resumeParser';
import { analyzeResumeRuleBased, type ResumeReport, type Suggestion } from '../utils/resumeScoring';
import { runGeminiJson, isGeminiEnabled } from '../utils/geminiJson';
import { InternshipStatus } from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

async function getStudent(userId: string) {
  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');
  return student;
}

/** Top in-demand skills across active internships — the keyword benchmark. */
async function getDemandedSkills(): Promise<string[]> {
  const rows = await Internship.aggregate([
    { $match: { status: InternshipStatus.ACTIVE } },
    { $unwind: '$requiredSkills' },
    { $group: { _id: { $toLower: '$requiredSkills.name' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 25 },
  ]);
  return rows.map((r) => r._id).filter(Boolean);
}

/** Optional AI enrichment — augments the deterministic report; best-effort. */
async function enrichWithGemini(report: ResumeReport, text: string): Promise<ResumeReport> {
  if (!isGeminiEnabled()) return report;
  const prompt = `You are an expert resume reviewer and ATS specialist. Given the resume text and a deterministic analysis, return STRICT JSON:
{"summaryFeedback": string (2 sentences), "extraSuggestions": [{"priority":"critical|high|medium|low","title":string,"why":string,"how":string,"expectedGain":number}] }
Focus on the 3 highest-impact improvements not already covered. Keep it specific to THIS resume.
Deterministic weak areas: ${JSON.stringify(report.suggestions.map((s) => s.title))}
Resume text (truncated): ${text.slice(0, 6000)}`;

  const ai = await runGeminiJson<{ summaryFeedback?: string; extraSuggestions?: Suggestion[] }>(prompt);
  if (!ai) return report;

  const merged: Suggestion[] = [...report.suggestions];
  for (const s of ai.extraSuggestions ?? []) {
    if (s?.title && s?.how) merged.push({ priority: s.priority ?? 'medium', title: s.title, why: s.why ?? '', how: s.how, expectedGain: s.expectedGain ?? 2 });
  }
  return { ...report, suggestions: merged.slice(0, 9), engine: 'ai-enhanced' };
}

function denormScores(report: ResumeReport) {
  const find = (k: string) => report.categories.find((c) => c.key === k)?.score ?? 0;
  return {
    overall: report.overallScore,
    ats: report.ats.score,
    grammar: report.grammar.score,
    keyword: find('keywords'),
    skill: find('technicalSkills'),
  };
}

export async function uploadAndAnalyze(userId: string, file: UploadFile): Promise<IResumeVersion> {
  const student = await getStudent(userId);

  // 1. Extract text (throws 422 on unreadable/scanned files)
  const parsed = await parseResume(file.buffer, file.mimetype);

  // 2. Store the file (optional — analysis is the core value; skip gracefully
  //    when Cloudinary isn't configured or the upload fails).
  let uploaded: { secure_url?: string; public_id?: string } = {};
  if (env.cloudinary.cloudName) {
    try {
      uploaded = await uploadBuffer(file.buffer, {
        resourceType: 'raw',
        folder: 'internbridge/resumes',
      });
    } catch (e) {
      logger.warn('Resume file storage failed; continuing with analysis only', e);
    }
  }

  return analyzeAndPersist(student, userId, parsed, {
    fileUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  });
}

/**
 * Analyze a resume from raw text (e.g. the in-app resume builder) — no file
 * parsing, so it never hits the "could not extract text" path that browser-
 * generated PDFs can trip. Still enforces the same minimum-content check.
 */
export async function analyzeFromText(
  userId: string,
  input: { text: string; name?: string }
): Promise<IResumeVersion> {
  const student = await getStudent(userId);
  const text = input.text.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount < 30) {
    throw AppError.unprocessable(
      'Your resume is too short to analyze — add more detail (summary, education, skills, projects) and try again.'
    );
  }

  const parsed = {
    text,
    wordCount,
    pageCount: 1,
    hyperlinks: extractUrls(text),
  };

  return analyzeAndPersist(student, userId, parsed, {
    originalName: `${(input.name || 'resume').replace(/[^\w.-]+/g, '_')}-built.txt`,
    mimeType: 'text/plain',
    sizeBytes: Buffer.byteLength(text, 'utf8'),
  });
}

/** Shared: run the scoring pipeline on already-parsed text and persist a version. */
async function analyzeAndPersist(
  student: Awaited<ReturnType<typeof getStudent>>,
  userId: string,
  parsed: { text: string; wordCount: number; pageCount?: number; hyperlinks: string[] },
  file: {
    fileUrl?: string;
    publicId?: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }
): Promise<IResumeVersion> {
  // Analyze (rule-based, then optional AI enrichment)
  const demanded = await getDemandedSkills();
  let report = analyzeResumeRuleBased({
    text: parsed.text,
    hyperlinks: parsed.hyperlinks,
    wordCount: parsed.wordCount,
    pageCount: parsed.pageCount,
    demandedSkills: demanded,
  });
  report = await enrichWithGemini(report, parsed.text);

  const last = await ResumeVersion.findOne({ studentId: student._id }).sort({ version: -1 }).select('version');
  const version = (last?.version ?? 0) + 1;

  const doc = await ResumeVersion.create({
    studentId: student._id,
    userId: new Types.ObjectId(userId),
    version,
    file: {
      fileUrl: file.fileUrl,
      publicId: file.publicId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    },
    extractedText: parsed.text,
    wordCount: parsed.wordCount,
    pageCount: parsed.pageCount,
    status: 'analyzed',
    report,
    scores: denormScores(report),
    analyzedAt: new Date(),
  });

  // Keep the Student profile's current resume pointer in sync (preserve an
  // existing URL if storage was skipped this time).
  student.resume = {
    fileUrl: file.fileUrl ?? student.resume?.fileUrl,
    publicId: file.publicId ?? student.resume?.publicId,
    parseStatus: 'done',
    version,
    uploadedAt: new Date(),
  };
  await student.save().catch((e) => logger.warn('Could not sync student.resume', e));

  const obj = doc.toObject();
  delete (obj as { extractedText?: string }).extractedText;
  return obj as IResumeVersion;
}

export async function listVersions(userId: string) {
  const student = await getStudent(userId);
  return ResumeVersion.find({ studentId: student._id })
    .sort({ version: -1 })
    .select('version file.originalName status scores analyzedAt createdAt report.strength report.overallScore')
    .lean();
}

export async function getVersion(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid version id');
  const student = await getStudent(userId);
  const doc = await ResumeVersion.findOne({ _id: id, studentId: student._id }).lean();
  if (!doc) throw AppError.notFound('Resume version not found');
  return doc;
}

export async function getLatest(userId: string) {
  const student = await getStudent(userId);
  const doc = await ResumeVersion.findOne({ studentId: student._id }).sort({ version: -1 }).lean();
  return doc; // may be null (no resume uploaded yet)
}

export async function getDashboard(userId: string) {
  const student = await getStudent(userId);
  const versions = await ResumeVersion.find({ studentId: student._id })
    .sort({ version: 1 })
    .select('version scores analyzedAt createdAt')
    .lean();

  const latest = await ResumeVersion.findOne({ studentId: student._id }).sort({ version: -1 }).lean();

  const history = versions.map((v) => ({
    version: v.version,
    date: v.createdAt,
    ...v.scores,
  }));

  const first = versions[0]?.scores.overall ?? 0;
  const current = latest?.scores.overall ?? 0;
  const improvement = versions.length > 1 ? current - first : 0;

  return {
    hasResume: Boolean(latest),
    latest: latest
      ? {
          id: latest._id,
          version: latest.version,
          scores: latest.scores,
          strength: latest.report?.strength,
          readinessScore: latest.report?.readinessScore,
          categories: latest.report?.categories,
          suggestions: latest.report?.suggestions,
          engine: latest.report?.engine,
        }
      : null,
    history,
    totalVersions: versions.length,
    improvement,
  };
}

export async function compareVersions(userId: string, aId: string, bId: string) {
  const [a, b] = await Promise.all([getVersion(userId, aId), getVersion(userId, bId)]);
  const catDiff = (a.report?.categories ?? []).map((ca) => {
    const cb = b.report?.categories?.find((c) => c.key === ca.key);
    return { key: ca.key, label: ca.label, a: ca.score, b: cb?.score ?? 0, delta: (cb?.score ?? 0) - ca.score };
  });
  return {
    a: { id: a._id, version: a.version, scores: a.scores },
    b: { id: b._id, version: b.version, scores: b.scores },
    overallDelta: (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0),
    categories: catDiff,
  };
}

export async function rewriteResume(userId: string, id: string) {
  const doc = await getVersionWithText(userId, id);

  if (isGeminiEnabled()) {
    const prompt = `You are an expert resume writer. Rewrite the resume to be ATS- and recruiter-friendly. Return STRICT JSON:
{"summary": string, "skillsSection": string, "bulletRewrites": [{"before": string, "after": string}], "achievements": [string]}
Use strong action verbs, quantify impact, remove weak phrases. Base it ONLY on the resume content.
Resume text: ${doc.extractedText?.slice(0, 8000)}`;
    const ai = await runGeminiJson<Record<string, unknown>>(prompt);
    if (ai) {
      await ResumeVersion.updateOne({ _id: doc._id }, { rewrite: ai });
      return { engine: 'ai', ...ai };
    }
  }

  // Deterministic "improvement kit" fallback when AI is unavailable.
  const report = doc.report;
  const kit = {
    engine: 'rule-based',
    summary:
      'Results-driven [year/field] student skilled in ' +
      (report?.skills.all.slice(0, 4).join(', ') || '[your top skills]') +
      '. Built [project] that [quantified impact]. Seeking an internship to [goal].',
    strongVerbs: ['Built', 'Engineered', 'Optimized', 'Led', 'Automated', 'Shipped', 'Reduced', 'Increased'],
    replaceWeakPhrases: (report?.grammar.weakPhrases ?? []).map((p) => ({
      before: p,
      after: 'Start with a strong verb, e.g. "Built…", "Led…", "Improved…"',
    })),
    quantifyTips: [
      'Add numbers: users served, % improvement, time saved, items processed.',
      'Turn "worked on a website" into "Built a React site serving 500+ monthly users".',
    ],
    addKeywords: report?.keywords.missing.slice(0, 8) ?? [],
  };
  await ResumeVersion.updateOne({ _id: doc._id }, { rewrite: kit });
  return kit;
}

export async function deleteVersion(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid version id');
  const student = await getStudent(userId);
  const doc = await ResumeVersion.findOne({ _id: id, studentId: student._id });
  if (!doc) throw AppError.notFound('Resume version not found');
  if (doc.file.publicId) await deleteAsset(doc.file.publicId, 'raw').catch(() => undefined);
  await doc.deleteOne();
  return { id };
}

async function getVersionWithText(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid version id');
  const student = await getStudent(userId);
  const doc = await ResumeVersion.findOne({ _id: id, studentId: student._id }).select('+extractedText');
  if (!doc) throw AppError.notFound('Resume version not found');
  return doc;
}
