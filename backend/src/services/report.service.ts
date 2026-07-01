import { Types } from 'mongoose';
import { Report } from '../models/Report';
import { Internship } from '../models/Internship';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Company } from '../models/Company';
import { AppError } from '../utils/AppError';
import { getPagination, buildMeta } from '../utils/pagination';
import {
  InternshipStatus,
  ReportStatus,
  ReportTargetType,
  UserStatus,
} from '../types';
import { audit } from './audit.service';
import { CreateReportInput, HandleReportInput } from '../validators/report.validator';

const AUTO_ESCALATE_THRESHOLD = 3;

/** Maps a report target to the owning User id, or null if the target is not a person. */
async function resolveUserId(
  targetType: ReportTargetType,
  targetId: Types.ObjectId
): Promise<Types.ObjectId | null> {
  if (targetType === ReportTargetType.USER) return targetId;
  if (targetType === ReportTargetType.STUDENT) {
    const student = await Student.findById(targetId).select('userId');
    return student?.userId ?? null;
  }
  if (targetType === ReportTargetType.COMPANY) {
    const company = await Company.findById(targetId).select('userId');
    return company?.userId ?? null;
  }
  return null; // internship / message have no single owning user to ban here
}

export async function createReport(reporterId: string, input: CreateReportInput) {
  try {
    const report = await Report.create({
      reporterId: new Types.ObjectId(reporterId),
      targetType: input.targetType,
      targetId: new Types.ObjectId(input.targetId),
      reason: input.reason,
      description: input.description,
    });

    // Auto-escalation: many open reports on one target → flag for priority review
    const openCount = await Report.countDocuments({
      targetType: input.targetType,
      targetId: input.targetId,
      status: ReportStatus.OPEN,
    });
    if (openCount >= AUTO_ESCALATE_THRESHOLD) {
      await audit({
        action: 'report.auto_escalated',
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: { openCount },
      });
    }

    return report;
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('You have already reported this item');
    }
    throw err;
  }
}

export async function listReports(query: Record<string, unknown>) {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.targetType) filter.targetType = query.targetType;

  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporterId', 'email role')
      .lean(),
    Report.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(page, limit, total) };
}

export async function handleReport(
  adminId: string,
  reportId: string,
  input: HandleReportInput
) {
  const report = await Report.findById(reportId);
  if (!report) throw AppError.notFound('Report not found');

  report.status = input.status;
  report.resolution = input.resolution;
  report.handledBy = new Types.ObjectId(adminId);
  report.handledAt = new Date();
  await report.save();

  // Optional enforcement action — resolve the correct entity from targetType
  // so we never apply a user action against an unrelated id (e.g. banning a
  // user whose id happens to collide with an internship/message id).
  if (input.action && input.action !== 'none') {
    if (input.action === 'remove_internship') {
      if (report.targetType !== ReportTargetType.INTERNSHIP) {
        throw AppError.badRequest('remove_internship is only valid for an internship report');
      }
      await Internship.findByIdAndUpdate(report.targetId, { status: InternshipStatus.REMOVED });
    } else if (input.action === 'suspend_user' || input.action === 'ban_user') {
      const userId = await resolveUserId(report.targetType, report.targetId);
      if (!userId) {
        throw AppError.badRequest('This report does not target a user account');
      }
      const status = input.action === 'ban_user' ? UserStatus.BANNED : UserStatus.SUSPENDED;
      const user = await User.findById(userId);
      if (user) {
        user.status = status;
        user.tokenVersion += 1; // force logout everywhere
        user.refreshTokenHash = null;
        await user.save();
      }
    }
  }

  await audit({
    actorUserId: adminId,
    actorRole: 'admin',
    action: `report.${input.status}`,
    targetType: 'Report',
    targetId: report._id,
    metadata: { action: input.action, reason: report.reason },
  });

  return report;
}
