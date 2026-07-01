import { FilterQuery, Types } from 'mongoose';
import { Internship, IInternship } from '../models/Internship';
import { Company } from '../models/Company';
import { AppError } from '../utils/AppError';
import { getPagination, buildMeta } from '../utils/pagination';
import { InternshipStatus, UserRole, VerificationStatus } from '../types';
import { CreateInternshipInput, UpdateInternshipInput } from '../validators/internship.validator';

async function getOwnedCompany(userId: string) {
  const company = await Company.findOne({ userId });
  if (!company) throw AppError.notFound('Company profile not found. Create one first.');
  return company;
}

/** Cross-field invariants enforced on both create and update. */
function validateInternshipInvariants(input: {
  eligibility?: { minYear?: number; maxYear?: number };
  deadline?: Date;
}): void {
  if (input.eligibility?.minYear && input.eligibility?.maxYear) {
    if (input.eligibility.minYear > input.eligibility.maxYear) {
      throw AppError.badRequest('eligibility.minYear cannot exceed maxYear');
    }
  }
  if (input.deadline && input.deadline.getTime() < Date.now()) {
    throw AppError.badRequest('Deadline must be in the future');
  }
}

export async function createInternship(userId: string, input: CreateInternshipInput) {
  const company = await getOwnedCompany(userId);

  if (company.verification.status !== VerificationStatus.VERIFIED) {
    // Allow creation as draft but block active publishing
    if (input.status === InternshipStatus.ACTIVE || !input.status) {
      throw AppError.forbidden(
        'Your company must be verified before publishing internships. You can save a draft instead.'
      );
    }
  }

  validateInternshipInvariants(input);

  const internship = await Internship.create({
    ...input,
    companyId: company._id,
    createdBy: new Types.ObjectId(userId),
    status: input.status ?? InternshipStatus.ACTIVE,
  });

  return internship;
}

export async function listInternships(query: Record<string, unknown>) {
  const { page, limit, skip } = getPagination(query);
  const filter: FilterQuery<IInternship> = { status: InternshipStatus.ACTIVE };

  if (query.skills) {
    const skillIds = String(query.skills)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (skillIds.length) filter['requiredSkills.skillId'] = { $in: skillIds };
  }
  if (query.city) filter['location.city'] = new RegExp(`^${String(query.city)}$`, 'i');
  if (query.remote === 'true') filter['location.remoteOk'] = true;
  if (query.minStipend) filter['stipend.amount'] = { $gte: Number(query.minStipend) };
  if (query.company && Types.ObjectId.isValid(String(query.company))) {
    filter.companyId = new Types.ObjectId(String(query.company));
  }
  if (query.year) {
    const y = Number(query.year);
    filter.$and = [
      { $or: [{ 'eligibility.minYear': { $exists: false } }, { 'eligibility.minYear': { $lte: y } }] },
      { $or: [{ 'eligibility.maxYear': { $exists: false } }, { 'eligibility.maxYear': { $gte: y } }] },
    ];
  }

  let useTextScore = false;
  if (query.q) {
    filter.$text = { $search: String(query.q) };
    useTextScore = true;
  }

  // Sorting
  let sort: Record<string, unknown> = { createdAt: -1 };
  if (query.sort === 'stipend') sort = { 'stipend.amount': -1 };
  else if (query.sort === 'recent') sort = { createdAt: -1 };
  else if (useTextScore) sort = { score: { $meta: 'textScore' }, createdAt: -1 };

  const projection = useTextScore ? { score: { $meta: 'textScore' } } : {};

  const [items, total] = await Promise.all([
    Internship.find(filter, projection)
      .sort(sort as never)
      .skip(skip)
      .limit(limit)
      .populate('companyId', 'name logoUrl verification.status industry')
      .lean(),
    Internship.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getInternshipById(id: string, incrementView = true) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid internship id');

  const internship = await Internship.findById(id).populate(
    'companyId',
    'name logoUrl description website industry verification.status'
  );
  if (!internship || internship.status === InternshipStatus.REMOVED) {
    throw AppError.notFound('Internship not found');
  }

  if (incrementView) {
    Internship.updateOne({ _id: id }, { $inc: { 'stats.views': 1 } }).catch(() => undefined);
  }

  return internship;
}

async function assertOwnership(id: string, userId: string, role: UserRole) {
  const internship = await Internship.findById(id);
  if (!internship || internship.status === InternshipStatus.REMOVED) {
    throw AppError.notFound('Internship not found');
  }
  if (role !== UserRole.ADMIN) {
    const company = await getOwnedCompany(userId);
    if (!internship.companyId.equals(company._id)) {
      throw AppError.forbidden('You can only manage your own internships');
    }
  }
  return internship;
}

export async function updateInternship(
  id: string,
  userId: string,
  role: UserRole,
  input: UpdateInternshipInput
) {
  const internship = await assertOwnership(id, userId, role);
  validateInternshipInvariants(input);
  Object.assign(internship, input);
  await internship.save();
  return internship;
}

export async function deleteInternship(id: string, userId: string, role: UserRole) {
  const internship = await assertOwnership(id, userId, role);
  internship.status = InternshipStatus.REMOVED;
  await internship.save();
  return { id };
}
