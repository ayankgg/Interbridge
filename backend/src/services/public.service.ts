import { Student } from '../models/Student';
import { Company } from '../models/Company';
import { Internship } from '../models/Internship';
import { AppError } from '../utils/AppError';
import { slugify, shortToken } from '../utils/identifiers';
import { InternshipStatus, VerificationStatus } from '../types';

/** Generates a unique slug for a model with a `slug` field. */
async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base) || 'user';
  if (!(await exists(root))) return root;
  for (let i = 0; i < 5; i += 1) {
    const candidate = `${root}-${shortToken(2)}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${shortToken(4)}`;
}

export async function setStudentVisibility(userId: string, isPublic: boolean) {
  const student = await Student.findOne({ userId });
  if (!student) throw AppError.notFound('Student profile not found');

  if (isPublic && !student.slug) {
    student.slug = await uniqueSlug(student.name, async (s) => !!(await Student.exists({ slug: s })));
  }
  student.publicProfile = isPublic;
  await student.save();
  return { slug: student.slug, publicProfile: student.publicProfile };
}

export async function setCompanyVisibility(userId: string, isPublic: boolean) {
  const company = await Company.findOne({ userId });
  if (!company) throw AppError.notFound('Company profile not found');

  if (isPublic && !company.slug) {
    company.slug = await uniqueSlug(company.name, async (s) => !!(await Company.exists({ slug: s })));
  }
  company.publicProfile = isPublic;
  await company.save();
  return { slug: company.slug, publicProfile: company.publicProfile };
}

/** Public student portfolio — whitelisted fields only; never exposes PII/email. */
export async function getPublicStudent(slug: string) {
  const student = await Student.findOne({ slug, publicProfile: true }).lean();
  if (!student) throw AppError.notFound('Profile not found');

  return {
    slug: student.slug,
    name: student.name,
    headline: student.headline,
    bio: student.bio,
    location: student.location?.city,
    college: student.college,
    yearOfStudy: student.yearOfStudy,
    skills: student.skills?.map((s) => ({ name: s.name, proficiency: s.proficiency })),
    projects: student.projects?.map((p) => ({ title: p.title, description: p.description, techStack: p.techStack, link: p.link })),
    certifications: student.certifications?.map((c) => ({ name: c.name, issuer: c.issuer })),
    links: student.links,
  };
}

/** Public company page + its active internships. */
export async function getPublicCompany(slug: string) {
  const company = await Company.findOne({ slug, publicProfile: true }).lean();
  if (!company) throw AppError.notFound('Company not found');

  const internships = await Internship.find({
    companyId: company._id,
    status: InternshipStatus.ACTIVE,
  })
    .select('title role location stipend deadline')
    .limit(50)
    .lean();

  return {
    slug: company.slug,
    name: company.name,
    logoUrl: company.logoUrl,
    description: company.description,
    website: company.website,
    industry: company.industry,
    size: company.size,
    verified: company.verification?.status === VerificationStatus.VERIFIED,
    openInternships: internships,
  };
}
