export enum UserRole {
  STUDENT = 'student',
  COMPANY = 'company',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING = 'pending',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum InternshipStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
  REMOVED = 'removed',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  HIRED = 'hired',
  WITHDRAWN = 'withdrawn',
}

export enum Proficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum NotificationType {
  APPLICATION_STATUS = 'application_status',
  NEW_APPLICANT = 'new_applicant',
  NEW_MATCH = 'new_match',
  COMPANY_VERIFIED = 'company_verified',
  NEW_MESSAGE = 'new_message',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_UPDATED = 'interview_updated',
  CERTIFICATE_ISSUED = 'certificate_issued',
  SYSTEM = 'system',
}

// ===== V2.0 additions (additive, backward-compatible) =====

export enum InterviewMode {
  ONLINE = 'online',
  ONSITE = 'onsite',
  PHONE = 'phone',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  RESCHEDULED = 'rescheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ReportTargetType {
  INTERNSHIP = 'internship',
  COMPANY = 'company',
  STUDENT = 'student',
  USER = 'user',
  MESSAGE = 'message',
}

export enum ReportReason {
  SPAM = 'spam',
  SCAM = 'scam',
  FEE_DEMAND = 'fee_demand',
  HARASSMENT = 'harassment',
  FAKE = 'fake',
  INAPPROPRIATE = 'inappropriate',
  OTHER = 'other',
}

export enum ReportStatus {
  OPEN = 'open',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReferralStatus {
  PENDING = 'pending',
  QUALIFIED = 'qualified',
}

export interface JwtPayload {
  sub: string; // userId
  role: UserRole;
  tokenVersion?: number;
}

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
  status: UserStatus;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
