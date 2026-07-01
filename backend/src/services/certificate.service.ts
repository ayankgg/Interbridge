import { Types } from 'mongoose';
import { Certificate } from '../models/Certificate';
import { Application } from '../models/Application';
import { Company } from '../models/Company';
import { Student } from '../models/Student';
import { AppError } from '../utils/AppError';
import { generateCertificateId } from '../utils/identifiers';
import { ApplicationStatus, NotificationType, UserRole } from '../types';
import { createNotification } from './notification.service';
import { audit } from './audit.service';
import { IssueCertificateInput } from '../validators/certificate.validator';

export async function issueCertificate(userId: string, input: IssueCertificateInput) {
  const application = await Application.findById(input.applicationId)
    .populate('internshipId', 'title')
    .populate('studentId', 'name userId')
    .populate('companyId', 'name userId');
  if (!application) throw AppError.notFound('Application not found');

  const company = await Company.findOne({ userId });
  if (!company || !application.companyId.equals(company._id)) {
    throw AppError.forbidden('You can only issue certificates for your own interns');
  }

  // Only interns who were actually hired can receive a completion certificate
  if (application.status !== ApplicationStatus.HIRED) {
    throw AppError.badRequest('Certificate can only be issued for a hired/completed intern');
  }

  const existing = await Certificate.findOne({ applicationId: application._id });
  if (existing) throw AppError.conflict('A certificate already exists for this application');

  const student = application.studentId as unknown as { _id: Types.ObjectId; name: string; userId: Types.ObjectId };

  const certificate = await Certificate.create({
    certificateId: generateCertificateId(),
    applicationId: application._id,
    internshipId: application.internshipId,
    studentId: student._id,
    companyId: company._id,
    studentName: student.name,
    companyName: company.name,
    title: input.title,
    skills: input.skills ?? [],
    startDate: input.startDate,
    endDate: input.endDate,
    issuedBy: new Types.ObjectId(userId),
  });

  await createNotification({
    userId: student.userId,
    type: NotificationType.CERTIFICATE_ISSUED,
    title: 'Certificate issued 🎓',
    body: `${company.name} issued your internship completion certificate.`,
    data: { certificateId: certificate.certificateId },
    email: true,
  });

  await audit({
    actorUserId: userId,
    actorRole: 'company',
    action: 'certificate.issued',
    targetType: 'Certificate',
    targetId: certificate._id,
  });

  return certificate;
}

export async function listMyCertificates(userId: string) {
  const student = await Student.findOne({ userId }).select('_id');
  if (!student) throw AppError.notFound('Student profile not found');
  return Certificate.find({ studentId: student._id }).sort({ issuedAt: -1 }).lean();
}

/** Public verification — minimal fields, no auth. */
export async function verifyCertificate(certificateId: string) {
  const cert = await Certificate.findOne({ certificateId }).lean();
  if (!cert) throw AppError.notFound('Certificate not found');
  return {
    certificateId: cert.certificateId,
    valid: !cert.revoked,
    revoked: cert.revoked,
    studentName: cert.studentName,
    companyName: cert.companyName,
    title: cert.title,
    skills: cert.skills,
    startDate: cert.startDate,
    endDate: cert.endDate,
    issuedAt: cert.issuedAt,
  };
}

export async function revokeCertificate(
  userId: string,
  role: UserRole,
  certPk: string,
  reason: string
) {
  if (!Types.ObjectId.isValid(certPk)) throw AppError.badRequest('Invalid certificate id');
  const cert = await Certificate.findById(certPk);
  if (!cert) throw AppError.notFound('Certificate not found');

  if (role !== UserRole.ADMIN) {
    const company = await Company.findOne({ userId });
    if (!company || !cert.companyId.equals(company._id)) {
      throw AppError.forbidden('You can only revoke certificates you issued');
    }
  }

  if (cert.revoked) throw AppError.badRequest('Certificate is already revoked');

  cert.revoked = true;
  cert.revokeReason = reason;
  await cert.save();

  await audit({
    actorUserId: userId,
    actorRole: role,
    action: 'certificate.revoked',
    targetType: 'Certificate',
    targetId: cert._id,
    metadata: { reason },
  });

  return cert;
}
