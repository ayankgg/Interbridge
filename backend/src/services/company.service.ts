import { Types } from 'mongoose';
import { Company } from '../models/Company';
import { Internship } from '../models/Internship';
import { Application } from '../models/Application';
import { AppError } from '../utils/AppError';
import { uploadBuffer, deleteAsset } from '../utils/cloudinaryUpload';
import { ApplicationStatus, InternshipStatus, VerificationStatus } from '../types';
import { UpdateCompanyInput } from '../validators/company.validator';

export async function getMyCompany(userId: string) {
  const company = await Company.findOne({ userId });
  if (!company) throw AppError.notFound('Company profile not found');
  return company;
}

/**
 * Public-facing company view. Whitelists fields so verification documents,
 * team member user-ids and the owner userId are never exposed to anonymous
 * or third-party callers (prevents data leakage / IDOR on GET /companies/:id).
 */
export async function getCompanyById(id: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid company id');
  const company = await Company.findById(id)
    .select('name logoUrl description website industry size location verification.status slug')
    .lean();
  if (!company) throw AppError.notFound('Company not found');

  return {
    id: company._id,
    name: company.name,
    logoUrl: company.logoUrl,
    description: company.description,
    website: company.website,
    industry: company.industry,
    size: company.size,
    location: company.location,
    verified: company.verification?.status === VerificationStatus.VERIFIED,
    slug: company.slug,
  };
}

export async function updateMyCompany(userId: string, input: UpdateCompanyInput) {
  const company = await getMyCompany(userId);
  Object.assign(company, input);
  await company.save();
  return company;
}

export async function uploadLogo(userId: string, buffer: Buffer) {
  const company = await getMyCompany(userId);
  if (company.logoPublicId) await deleteAsset(company.logoPublicId, 'image').catch(() => undefined);

  const result = await uploadBuffer(buffer, { resourceType: 'image', folder: 'internbridge/logos' });
  company.logoUrl = result.secure_url;
  company.logoPublicId = result.public_id;
  await company.save();
  return { logoUrl: company.logoUrl };
}

export async function submitVerification(userId: string, docs: { name: string; url: string }[]) {
  const company = await getMyCompany(userId);
  if (company.verification.status === VerificationStatus.VERIFIED) {
    throw AppError.badRequest('Company is already verified');
  }
  company.verification.status = VerificationStatus.PENDING;
  company.verification.docs = docs;
  company.verification.reason = null;
  await company.save();
  return company;
}

/**
 * Aggregated hiring analytics for the company dashboard.
 */
export async function getCompanyAnalytics(userId: string) {
  const company = await getMyCompany(userId);

  const [internshipStats, applicationFunnel, topInternships] = await Promise.all([
    Internship.aggregate([
      { $match: { companyId: company._id, status: { $ne: InternshipStatus.REMOVED } } },
      {
        $group: {
          _id: null,
          totalInternships: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', InternshipStatus.ACTIVE] }, 1, 0] } },
          totalViews: { $sum: '$stats.views' },
          totalApplications: { $sum: '$stats.applications' },
        },
      },
    ]),
    Application.aggregate([
      { $match: { companyId: company._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Internship.find({ companyId: company._id, status: { $ne: InternshipStatus.REMOVED } })
      .sort({ 'stats.applications': -1 })
      .limit(5)
      .select('title stats')
      .lean(),
  ]);

  const funnel: Record<string, number> = {
    pending: 0,
    shortlisted: 0,
    rejected: 0,
    hired: 0,
    withdrawn: 0,
  };
  for (const row of applicationFunnel) funnel[row._id] = row.count;

  const totals = internshipStats[0] ?? {
    totalInternships: 0,
    active: 0,
    totalViews: 0,
    totalApplications: 0,
  };

  const avgMatch = await Application.aggregate([
    { $match: { companyId: company._id } },
    { $group: { _id: null, avg: { $avg: '$matchScore' } } },
  ]);

  return {
    verification: company.verification.status,
    internships: {
      total: totals.totalInternships,
      active: totals.active,
      totalViews: totals.totalViews,
      totalApplications: totals.totalApplications,
    },
    applicationFunnel: funnel,
    averageMatchScore: Math.round(avgMatch[0]?.avg ?? 0),
    topInternships,
  };
}

/**
 * All applicants across the company's internships (pipeline / board view).
 */
export async function getAllApplicants(userId: string, query: Record<string, unknown>) {
  const company = await getMyCompany(userId);
  // Exclude withdrawn apps so `total` matches the rendered pipeline board.
  const filter: Record<string, unknown> = {
    companyId: company._id,
    status: { $ne: ApplicationStatus.WITHDRAWN },
  };
  if (query.status) filter.status = query.status;
  if (query.internshipId && Types.ObjectId.isValid(String(query.internshipId))) {
    filter.internshipId = new Types.ObjectId(String(query.internshipId));
  }

  const applications = await Application.find(filter)
    .sort({ matchScore: -1, createdAt: -1 })
    .populate('studentId', 'name headline skills yearOfStudy location')
    .populate('internshipId', 'title')
    .limit(500)
    .lean();

  // Group into a pipeline board
  const board: Record<string, unknown[]> = {
    [ApplicationStatus.PENDING]: [],
    [ApplicationStatus.SHORTLISTED]: [],
    [ApplicationStatus.REJECTED]: [],
    [ApplicationStatus.HIRED]: [],
  };
  for (const app of applications) {
    if (board[app.status]) board[app.status].push(app);
  }

  return { board, total: applications.length };
}
