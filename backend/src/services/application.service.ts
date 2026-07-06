import { Types } from 'mongoose';
import { Application } from '../models/Application';
import { Internship } from '../models/Internship';
import { Student } from '../models/Student';
import { Company } from '../models/Company';
import { AppError } from '../utils/AppError';
import { getPagination, buildMeta } from '../utils/pagination';
import { ApplicationStatus, InternshipStatus, NotificationType, UserRole } from '../types';
import { computeMatch } from '../utils/matching';
import { createNotification } from './notification.service';
import { UpdateStatusInput } from '../validators/application.validator';

export async function applyToInternship(
  userId: string,
  internshipId: string,
  coverLetter?: string
) {
  if (!Types.ObjectId.isValid(internshipId)) throw AppError.badRequest('Invalid internship id');

  const internship = await Internship.findById(internshipId);
  if (!internship || internship.status !== InternshipStatus.ACTIVE) {
    throw AppError.notFound('Internship is not open for applications');
  }
  if (internship.deadline && internship.deadline.getTime() < Date.now()) {
    throw AppError.badRequest('Application deadline has passed');
  }

  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');

  const existing = await Application.findOne({ internshipId, studentId: student._id });
  if (existing) throw AppError.conflict('You have already applied to this internship');

  const match = computeMatch(student, internship);

  let application: InstanceType<typeof Application>;
  try {
    application = await Application.create({
      internshipId: internship._id,
      studentId: student._id,
      companyId: internship.companyId,
      status: ApplicationStatus.PENDING,
      matchScore: match.score,
      matchBreakdown: match,
      coverLetter,
      snapshot: {
        name: student.name,
        headline: student.headline,
        skills: student.skills.map((s) => ({ name: s.name, proficiency: s.proficiency })),
        projects: student.projects.map((p) => ({ title: p.title, techStack: p.techStack })),
        resumeUrl: student.resume?.fileUrl,
      },
      statusHistory: [
        { status: ApplicationStatus.PENDING, at: new Date(), byUserId: new Types.ObjectId(userId) },
      ],
    });
  } catch (err: unknown) {
    // Unique index guards against a race that slipped past the earlier check
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('You have already applied to this internship');
    }
    throw err;
  }

  // Best-effort counter increment (non-critical)
  Internship.updateOne(
    { _id: internship._id },
    { $inc: { 'stats.applications': 1 } }
  ).catch(() => undefined);

  // Notify the company owner
  const company = await Company.findById(internship.companyId).select('userId');
  if (company) {
    await createNotification({
      userId: company.userId,
      type: NotificationType.NEW_APPLICANT,
      title: 'New applicant',
      body: `${student.name} applied to "${internship.title}" (match ${match.score}%)`,
      data: { internshipId: internship._id, applicationId: application._id },
    });
  }

  return application;
}

export async function withdrawApplication(userId: string, applicationId: string) {
  if (!Types.ObjectId.isValid(applicationId)) throw AppError.badRequest('Invalid application id');
  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');

  const application = await Application.findOne({ _id: applicationId, studentId: student._id });
  if (!application) throw AppError.notFound('Application not found');
  if (application.status === ApplicationStatus.HIRED) {
    throw AppError.badRequest('Cannot withdraw an application that has been hired');
  }

  application.status = ApplicationStatus.WITHDRAWN;
  application.statusHistory.push({
    status: ApplicationStatus.WITHDRAWN,
    at: new Date(),
    byUserId: new Types.ObjectId(userId),
  });
  await application.save();
  return application;
}

export async function getStudentApplications(
  userId: string,
  query: Record<string, unknown>
) {
  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');

  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = { studentId: student._id };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('internshipId', 'title status deadline location stipend companyId')
      .lean(),
    Application.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function assertCompanyOwnsInternship(internshipId: string, userId: string, role: UserRole) {
  const internship = await Internship.findById(internshipId);
  if (!internship) throw AppError.notFound('Internship not found');
  if (role !== UserRole.ADMIN) {
    const company = await Company.findOne({ userId });
    if (!company || !internship.companyId.equals(company._id)) {
      throw AppError.forbidden('You can only view applicants for your own internships');
    }
  }
  return internship;
}

export async function getApplicationsForInternship(
  internshipId: string,
  userId: string,
  role: UserRole,
  query: Record<string, unknown>
) {
  await assertCompanyOwnsInternship(internshipId, userId, role);

  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = { internshipId };
  if (query.status) filter.status = query.status;
  if (query.minScore) filter.matchScore = { $gte: Number(query.minScore) };

  const sort =
    query.sort === 'recent' ? { createdAt: -1 } : { matchScore: -1, createdAt: -1 };

  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort(sort as never)
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'name headline skills location yearOfStudy links')
      .lean(),
    Application.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

// Allowed forward transitions in the hiring pipeline. Prevents resurrecting
// terminal states (re-hiring), skipping stages, or no-op churn.
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.PENDING]: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
  [ApplicationStatus.SHORTLISTED]: [ApplicationStatus.HIRED, ApplicationStatus.REJECTED],
  [ApplicationStatus.REJECTED]: [ApplicationStatus.SHORTLISTED],
  [ApplicationStatus.HIRED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

export async function updateApplicationStatus(
  applicationId: string,
  userId: string,
  role: UserRole,
  input: UpdateStatusInput
) {
  if (!Types.ObjectId.isValid(applicationId)) throw AppError.badRequest('Invalid application id');
  const application = await Application.findById(applicationId);
  if (!application) throw AppError.notFound('Application not found');

  if (role !== UserRole.ADMIN) {
    const company = await Company.findOne({ userId });
    if (!company || !application.companyId.equals(company._id)) {
      throw AppError.forbidden('You can only manage applicants for your own internships');
    }
  }

  if (application.status === ApplicationStatus.WITHDRAWN) {
    throw AppError.badRequest('Cannot change status of a withdrawn application');
  }
  if (input.status === application.status) {
    throw AppError.badRequest('Application is already in that status');
  }
  if (!ALLOWED_TRANSITIONS[application.status].includes(input.status)) {
    throw AppError.badRequest(
      `Invalid status transition from ${application.status} to ${input.status}`
    );
  }

  const previous = application.status;
  application.status = input.status;
  application.statusHistory.push({
    status: input.status,
    at: new Date(),
    byUserId: new Types.ObjectId(userId),
    note: input.note,
  });
  await application.save();

  if (input.status === ApplicationStatus.SHORTLISTED && previous !== ApplicationStatus.SHORTLISTED) {
    Internship.updateOne(
      { _id: application.internshipId },
      { $inc: { 'stats.shortlists': 1 } }
    ).catch(() => undefined);
  }

  // Notify the student
  const student = await Student.findById(application.studentId).select('userId');
  const internship = await Internship.findById(application.internshipId).select('title');
  if (student) {
    await createNotification({
      userId: student.userId,
      type: NotificationType.APPLICATION_STATUS,
      title: 'Application update',
      body: `Your application for "${internship?.title ?? 'an internship'}" is now ${input.status}`,
      data: { applicationId: application._id, status: input.status },
      email: input.status === ApplicationStatus.HIRED || input.status === ApplicationStatus.SHORTLISTED,
      whatsapp: true,
      whatsappPreference: 'applicationUpdates',
    });
  }

  return application;
}

export async function addNote(
  applicationId: string,
  userId: string,
  role: UserRole,
  text: string
) {
  if (!Types.ObjectId.isValid(applicationId)) throw AppError.badRequest('Invalid application id');
  const application = await Application.findById(applicationId);
  if (!application) throw AppError.notFound('Application not found');
  if (role !== UserRole.ADMIN) {
    const company = await Company.findOne({ userId });
    if (!company || !application.companyId.equals(company._id)) {
      throw AppError.forbidden('Not permitted');
    }
  }
  application.companyNotes.push({ text, byUserId: new Types.ObjectId(userId), at: new Date() });
  await application.save();
  return application;
}
