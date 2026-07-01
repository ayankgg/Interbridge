import { Types } from 'mongoose';
import { Student } from '../models/Student';
import { SavedInternship } from '../models/SavedInternship';
import { Internship } from '../models/Internship';
import { Application } from '../models/Application';
import { AppError } from '../utils/AppError';
import { uploadBuffer, deleteAsset } from '../utils/cloudinaryUpload';
import { computeCompleteness } from '../utils/completeness';
import { getPagination, buildMeta } from '../utils/pagination';
import { InternshipStatus } from '../types';
import { env } from '../config/env';
import { UpdateStudentInput } from '../validators/student.validator';

export async function getMyProfile(userId: string) {
  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');
  return student;
}

export async function updateMyProfile(userId: string, input: UpdateStudentInput) {
  const student = await getMyProfile(userId);
  Object.assign(student, input);
  student.profileCompleteness = computeCompleteness(student);
  await student.save();
  return student;
}

export async function uploadResume(userId: string, buffer: Buffer) {
  const student = await getMyProfile(userId);
  if (student.resume?.publicId) {
    await deleteAsset(student.resume.publicId, 'raw').catch(() => undefined);
  }
  const result = await uploadBuffer(buffer, {
    resourceType: 'raw',
    folder: 'internbridge/resumes',
  });

  student.resume = {
    fileUrl: result.secure_url,
    publicId: result.public_id,
    parseStatus: 'pending',
    version: (student.resume?.version ?? 0) + 1,
    uploadedAt: new Date(),
  };
  student.profileCompleteness = computeCompleteness(student);
  await student.save();

  return { resumeUrl: student.resume.fileUrl, version: student.resume.version };
}

/**
 * Sets the student's profile photo. Uses Cloudinary when configured; otherwise
 * stores a compact data URL (the client resizes to a small thumbnail first), so
 * avatars work even without external object storage.
 */
export async function uploadAvatar(userId: string, buffer: Buffer, mimeType: string) {
  const student = await getMyProfile(userId);

  if (env.cloudinary.cloudName) {
    if (student.avatarPublicId) {
      await deleteAsset(student.avatarPublicId, 'image').catch(() => undefined);
    }
    const result = await uploadBuffer(buffer, {
      resourceType: 'image',
      folder: 'internbridge/avatars',
    });
    student.avatarUrl = result.secure_url;
    student.avatarPublicId = result.public_id;
  } else {
    // Fallback: inline data URL. Guard the size so we never bloat the document.
    if (buffer.length > 400 * 1024) {
      throw AppError.badRequest('Image is too large — please choose a smaller photo.');
    }
    student.avatarUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    student.avatarPublicId = undefined;
  }

  await student.save();
  return { avatarUrl: student.avatarUrl };
}

export async function removeAvatar(userId: string) {
  const student = await getMyProfile(userId);
  if (student.avatarPublicId) {
    await deleteAsset(student.avatarPublicId, 'image').catch(() => undefined);
  }
  student.avatarUrl = undefined;
  student.avatarPublicId = undefined;
  await student.save();
  return { avatarUrl: null };
}

export async function saveInternship(userId: string, internshipId: string) {
  if (!Types.ObjectId.isValid(internshipId)) throw AppError.badRequest('Invalid internship id');
  const student = await getMyProfile(userId);
  const internship = await Internship.findById(internshipId);
  if (!internship) throw AppError.notFound('Internship not found');

  try {
    const saved = await SavedInternship.create({
      studentId: student._id,
      internshipId,
    });
    return saved;
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('Internship already saved');
    }
    throw err;
  }
}

export async function unsaveInternship(userId: string, internshipId: string) {
  const student = await getMyProfile(userId);
  const result = await SavedInternship.findOneAndDelete({
    studentId: student._id,
    internshipId,
  });
  if (!result) throw AppError.notFound('Saved internship not found');
  return { internshipId };
}

export async function listSaved(userId: string, query: Record<string, unknown>) {
  const student = await getMyProfile(userId);
  const { page, limit, skip } = getPagination(query);

  const [items, total] = await Promise.all([
    SavedInternship.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'internshipId',
        select: 'title status deadline location stipend companyId',
        populate: { path: 'companyId', select: 'name logoUrl' },
      })
      .lean(),
    SavedInternship.countDocuments({ studentId: student._id }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getDashboard(userId: string) {
  const student = await getMyProfile(userId);

  const [applicationCounts, savedCount, activeInternships] = await Promise.all([
    Application.aggregate([
      { $match: { studentId: student._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    SavedInternship.countDocuments({ studentId: student._id }),
    Internship.countDocuments({ status: InternshipStatus.ACTIVE }),
  ]);

  const pipeline: Record<string, number> = {
    pending: 0,
    shortlisted: 0,
    rejected: 0,
    hired: 0,
    withdrawn: 0,
  };
  for (const row of applicationCounts) pipeline[row._id] = row.count;

  return {
    profileCompleteness: student.profileCompleteness,
    jobSeekingStatus: student.jobSeekingStatus,
    applicationPipeline: pipeline,
    savedCount,
    activeInternships,
    skillsCount: student.skills.length,
    hasResume: Boolean(student.resume?.fileUrl),
  };
}
