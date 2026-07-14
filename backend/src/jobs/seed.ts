/* eslint-disable no-console */
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Company } from '../models/Company';
import { Internship } from '../models/Internship';
import { hashPassword } from '../utils/password';
import { UserRole, UserStatus, VerificationStatus, Proficiency, InternshipStatus } from '../types';

async function seed(): Promise<void> {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Company.deleteMany({}),
    Internship.deleteMany({}),
  ]);

  const password = await hashPassword('Password123');

  // Admin
  await User.create({
    email: 'admin@internbridge.com',
    passwordHash: password,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });

  // Student
  const studentUser = await User.create({
    email: 'student@example.com',
    passwordHash: password,
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  await Student.create({
    userId: studentUser._id,
    name: 'Aarav Sharma',
    headline: '2nd-year CSE | Python & React enthusiast',
    yearOfStudy: 2,
    college: 'XYZ Institute of Technology',
    skills: [
      { skillId: 'python', name: 'Python', proficiency: Proficiency.INTERMEDIATE },
      { skillId: 'react', name: 'React', proficiency: Proficiency.BEGINNER },
      { skillId: 'html', name: 'HTML', proficiency: Proficiency.ADVANCED },
    ],
    projects: [{ title: 'Portfolio Website', techStack: ['react', 'css'], link: '' }],
    profileCompleteness: 70,
  });

  // Company
  const companyUser = await User.create({
    email: 'company@example.com',
    passwordHash: password,
    role: UserRole.COMPANY,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const company = await Company.create({
    userId: companyUser._id,
    name: 'TechStart Labs',
    description: 'A fast-growing startup building developer tools.',
    industry: 'Software',
    size: '11-50',
    verification: { status: VerificationStatus.VERIFIED, docs: [], verifiedAt: new Date() },
  });

  await Internship.create([
    {
      companyId: company._id,
      createdBy: companyUser._id,
      title: 'Frontend Developer Intern',
      description: 'Work on our React-based dashboard. Great for early-year students.',
      role: 'Frontend',
      requiredSkills: [
        { skillId: 'react', name: 'React', weight: 2, minProficiency: Proficiency.BEGINNER },
        { skillId: 'html', name: 'HTML', weight: 1, minProficiency: Proficiency.INTERMEDIATE },
      ],
      eligibility: { minYear: 1, maxYear: 4 },
      location: { city: 'Remote', remoteOk: true },
      stipend: { amount: 10000, currency: 'INR', period: 'month' },
      duration: '3 months',
      openings: 2,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: InternshipStatus.ACTIVE,
    },
    {
      companyId: company._id,
      createdBy: companyUser._id,
      title: 'Python Backend Intern',
      description: 'Help build our REST APIs in Python.',
      role: 'Backend',
      requiredSkills: [
        { skillId: 'python', name: 'Python', weight: 2, minProficiency: Proficiency.INTERMEDIATE },
      ],
      eligibility: { minYear: 2, maxYear: 4 },
      location: { city: 'Bengaluru', remoteOk: false },
      stipend: { amount: 15000, currency: 'INR', period: 'month' },
      duration: '6 months',
      openings: 1,
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: InternshipStatus.ACTIVE,
    },
  ]);

  console.log('Seed complete.');
  console.log('Login: admin@internbridge.com / student@example.com / company@example.com');
  console.log('Password: Password123');

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
