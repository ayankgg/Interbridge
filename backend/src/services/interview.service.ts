import { Types } from 'mongoose';
import { Interview } from '../models/Interview';
import { Application } from '../models/Application';
import { Company } from '../models/Company';
import { Student } from '../models/Student';
import { Internship } from '../models/Internship';
import { AppError } from '../utils/AppError';
import { buildIcs } from '../utils/ics';
import { ApplicationStatus, InterviewStatus, NotificationType, UserRole } from '../types';
import { createNotification } from './notification.service';
import { CreateInterviewInput, UpdateInterviewInput } from '../validators/interview.validator';

async function companyForUser(userId: string) {
  const company = await Company.findOne({ userId });
  if (!company) throw AppError.notFound('Company profile not found');
  return company;
}

export async function scheduleInterview(userId: string, input: CreateInterviewInput) {
  const application = await Application.findById(input.applicationId);
  if (!application) throw AppError.notFound('Application not found');

  const company = await companyForUser(userId);
  if (!application.companyId.equals(company._id)) {
    throw AppError.forbidden('You can only schedule interviews for your own applicants');
  }

  // Don't schedule interviews for applicants who are no longer in the pipeline.
  if (
    application.status === ApplicationStatus.WITHDRAWN ||
    application.status === ApplicationStatus.REJECTED
  ) {
    throw AppError.badRequest('Cannot schedule an interview for a withdrawn or rejected application');
  }

  const interview = await Interview.create({
    applicationId: application._id,
    internshipId: application.internshipId,
    companyId: application.companyId,
    studentId: application.studentId,
    scheduledBy: new Types.ObjectId(userId),
    mode: input.mode,
    startAt: input.startAt,
    endAt: input.endAt,
    meetingLink: input.meetingLink,
    location: input.location,
    notes: input.notes,
    history: [{ status: InterviewStatus.SCHEDULED, startAt: input.startAt, at: new Date(), byUserId: new Types.ObjectId(userId) }],
  });

  const student = await Student.findById(application.studentId).select('userId');
  const internship = await Internship.findById(application.internshipId).select('title');
  if (student) {
    await createNotification({
      userId: student.userId,
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: 'Interview scheduled',
      body: `An interview for "${internship?.title ?? 'an internship'}" is scheduled for ${input.startAt.toUTCString()}`,
      data: { interviewId: interview._id, applicationId: application._id },
      email: true,
    });
  }

  return interview;
}

export async function listInterviews(
  userId: string,
  role: UserRole,
  query: Record<string, unknown>
) {
  const filter: Record<string, unknown> = {};

  if (role === UserRole.STUDENT) {
    const student = await Student.findOne({ userId }).select('_id');
    if (!student) throw AppError.notFound('Student profile not found');
    filter.studentId = student._id;
  } else if (role === UserRole.COMPANY) {
    const company = await companyForUser(userId);
    filter.companyId = company._id;
  }

  if (query.upcoming === 'true') filter.startAt = { $gte: new Date() };
  if (query.status) filter.status = query.status;

  const interviews = await Interview.find(filter)
    .sort({ startAt: 1 })
    .populate('internshipId', 'title')
    .limit(200)
    .lean();

  return interviews;
}

async function getOwned(userId: string, role: UserRole, interviewId: string) {
  const interview = await Interview.findById(interviewId);
  if (!interview) throw AppError.notFound('Interview not found');

  if (role === UserRole.STUDENT) {
    const student = await Student.findOne({ userId }).select('_id');
    if (!student || !interview.studentId.equals(student._id)) {
      throw AppError.forbidden('Not your interview');
    }
  } else if (role === UserRole.COMPANY) {
    const company = await companyForUser(userId);
    if (!interview.companyId.equals(company._id)) throw AppError.forbidden('Not your interview');
  }
  return interview;
}

export async function getInterview(userId: string, role: UserRole, interviewId: string) {
  return getOwned(userId, role, interviewId);
}

export async function updateInterview(
  userId: string,
  role: UserRole,
  interviewId: string,
  input: UpdateInterviewInput
) {
  const interview = await getOwned(userId, role, interviewId);

  // A finished or cancelled interview is terminal — no further edits.
  if (
    interview.status === InterviewStatus.CANCELLED ||
    interview.status === InterviewStatus.COMPLETED
  ) {
    throw AppError.badRequest('This interview is closed and can no longer be changed');
  }

  // Students may only cancel; companies/admins may fully manage.
  if (role === UserRole.STUDENT && input.status !== InterviewStatus.CANCELLED) {
    throw AppError.forbidden('Students may only cancel an interview');
  }

  // A rescheduled time must be in the future.
  if (input.startAt && input.startAt.getTime() < Date.now()) {
    throw AppError.badRequest('startAt must be in the future');
  }

  if (input.startAt) interview.startAt = input.startAt;
  if (input.endAt) interview.endAt = input.endAt;
  if (input.meetingLink !== undefined) interview.meetingLink = input.meetingLink;
  if (input.location !== undefined) interview.location = input.location;
  if (input.notes !== undefined) interview.notes = input.notes;

  const newStatus = input.status ?? (input.startAt ? InterviewStatus.RESCHEDULED : interview.status);
  if (interview.endAt <= interview.startAt) {
    throw AppError.badRequest('endAt must be after startAt');
  }
  interview.status = newStatus;
  interview.history.push({
    status: newStatus,
    startAt: interview.startAt,
    at: new Date(),
    byUserId: new Types.ObjectId(userId),
    note: input.notes,
  });
  await interview.save();

  // Notify the counterparty
  const student = await Student.findById(interview.studentId).select('userId');
  const company = await Company.findById(interview.companyId).select('userId');
  const notifyUserId = role === UserRole.STUDENT ? company?.userId : student?.userId;
  if (notifyUserId) {
    await createNotification({
      userId: notifyUserId,
      type: NotificationType.INTERVIEW_UPDATED,
      title: 'Interview updated',
      body: `An interview was ${newStatus}.`,
      data: { interviewId: interview._id },
      email: newStatus === InterviewStatus.CANCELLED,
    });
  }

  return interview;
}

export async function getInterviewIcs(
  userId: string,
  role: UserRole,
  interviewId: string,
  stamp: Date
) {
  const interview = await getOwned(userId, role, interviewId);
  const internship = await Internship.findById(interview.internshipId).select('title');

  return buildIcs(
    {
      uid: `${interview._id.toString()}@internbridge`,
      title: `Interview — ${internship?.title ?? 'InternBridge'}`,
      description: interview.notes || `Mode: ${interview.mode}`,
      location: interview.meetingLink || interview.location,
      start: interview.startAt,
      end: interview.endAt,
    },
    stamp
  );
}
