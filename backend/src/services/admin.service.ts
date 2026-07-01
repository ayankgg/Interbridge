import { Types } from 'mongoose';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Internship } from '../models/Internship';
import { Application } from '../models/Application';
import { Student } from '../models/Student';
import { AppError } from '../utils/AppError';
import { getPagination, buildMeta } from '../utils/pagination';
import {
  InternshipStatus,
  NotificationType,
  UserStatus,
  VerificationStatus,
} from '../types';
import { createNotification } from './notification.service';
import { audit } from './audit.service';

export async function listUsers(query: Record<string, unknown>) {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.q) filter.email = new RegExp(String(query.q), 'i');

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(page, limit, total) };
}

export async function updateUserStatus(
  adminId: string,
  userId: string,
  status: UserStatus,
  reason?: string
) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');

  user.status = status;
  if (status !== UserStatus.ACTIVE) {
    user.tokenVersion += 1; // force logout
    user.refreshTokenHash = null;
  }
  await user.save();

  await audit({
    actorUserId: adminId,
    actorRole: 'admin',
    action: `user.status.${status}`,
    targetType: 'User',
    targetId: user._id,
    metadata: { reason },
  });

  return user;
}

export async function listPendingCompanies(query: Record<string, unknown>) {
  const { page, limit, skip } = getPagination(query);
  const filter = { 'verification.status': VerificationStatus.PENDING };
  const [items, total] = await Promise.all([
    Company.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Company.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(page, limit, total) };
}

export async function verifyCompany(
  adminId: string,
  companyId: string,
  decision: VerificationStatus,
  reason?: string
) {
  const company = await Company.findById(companyId);
  if (!company) throw AppError.notFound('Company not found');

  company.verification.status = decision;
  company.verification.verifiedBy = new Types.ObjectId(adminId);
  company.verification.verifiedAt = new Date();
  company.verification.reason = reason ?? null;
  await company.save();

  await audit({
    actorUserId: adminId,
    actorRole: 'admin',
    action: `company.${decision}`,
    targetType: 'Company',
    targetId: company._id,
    metadata: { reason },
  });

  await createNotification({
    userId: company.userId,
    type: NotificationType.COMPANY_VERIFIED,
    title: decision === VerificationStatus.VERIFIED ? 'Company verified' : 'Verification rejected',
    body:
      decision === VerificationStatus.VERIFIED
        ? 'Your company has been verified. You can now publish internships.'
        : `Your verification was rejected. ${reason ?? ''}`,
    email: true,
  });

  return company;
}

export async function moderateInternship(adminId: string, internshipId: string) {
  const internship = await Internship.findById(internshipId);
  if (!internship) throw AppError.notFound('Internship not found');
  internship.status = InternshipStatus.REMOVED;
  await internship.save();

  await audit({
    actorUserId: adminId,
    actorRole: 'admin',
    action: 'internship.removed',
    targetType: 'Internship',
    targetId: internship._id,
  });
  return { id: internship._id };
}

export async function getPlatformAnalytics() {
  const [users, students, companies, internships, applications, hires] = await Promise.all([
    User.countDocuments(),
    Student.countDocuments(),
    Company.countDocuments(),
    Internship.countDocuments({ status: InternshipStatus.ACTIVE }),
    Application.countDocuments(),
    Application.countDocuments({ status: 'hired' }),
  ]);

  const pendingVerifications = await Company.countDocuments({
    'verification.status': VerificationStatus.PENDING,
  });

  return {
    users,
    students,
    companies,
    activeInternships: internships,
    applications,
    successfulHires: hires,
    pendingVerifications,
    liquidity: students > 0 ? Number((internships / students).toFixed(3)) : 0,
  };
}
