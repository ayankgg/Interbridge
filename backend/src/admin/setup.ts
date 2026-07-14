import type { Router } from 'express';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';

import { User } from '../models/User';
import { Student } from '../models/Student';
import { Company } from '../models/Company';
import { Internship } from '../models/Internship';
import { Application } from '../models/Application';
import { SavedInternship } from '../models/SavedInternship';
import { Notification } from '../models/Notification';
import { Report } from '../models/Report';
import { Certificate } from '../models/Certificate';
import { Interview } from '../models/Interview';
import { Referral } from '../models/Referral';
import { ResumeVersion } from '../models/ResumeVersion';
import { ActivityLog } from '../models/ActivityLog';

import { comparePassword } from '../utils/password';
import { UserRole } from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { LoginPage } from './login-page';

AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

const ROOT_PATH = '/admin';

const nav = {
  people: { name: 'People', icon: 'User' },
  marketplace: { name: 'Marketplace', icon: 'Briefcase' },
  engagement: { name: 'Engagement', icon: 'Bell' },
  system: { name: 'System', icon: 'Settings' },
};

/**
 * Builds the AdminJS admin panel router. Auto-generates CRUD screens from the
 * Mongoose models (like Django admin), gated behind a login that only accepts
 * existing admin-role users from the database.
 */
export function buildAdminRouter(): { admin: AdminJS; router: Router } {
  const admin = new AdminJS({
    rootPath: ROOT_PATH,
    branding: {
      companyName: 'InternBridge Admin',
      logo: false,
      withMadeWithLove: false,
    },
    resources: [
      {
        resource: User,
        options: {
          navigation: nav.people,
          listProperties: ['email', 'role', 'status', 'emailVerified', 'createdAt'],
          filterProperties: ['email', 'role', 'status', 'emailVerified'],
          properties: {
            passwordHash: { isVisible: false },
            refreshTokenHash: { isVisible: false },
            resetPasswordTokenHash: { isVisible: false },
            resetPasswordExpires: { isVisible: false },
            tokenVersion: { isVisible: { list: false, edit: false, filter: false, show: true } },
          },
        },
      },
      { resource: Student, options: { navigation: nav.people, listProperties: ['name', 'college', 'yearOfStudy', 'jobSeekingStatus', 'profileCompleteness', 'createdAt'] } },
      { resource: Company, options: { navigation: nav.people, listProperties: ['name', 'industry', 'size', 'createdAt'] } },

      { resource: Internship, options: { navigation: nav.marketplace, listProperties: ['title', 'role', 'status', 'openings', 'deadline', 'createdAt'] } },
      { resource: Application, options: { navigation: nav.marketplace, listProperties: ['status', 'matchScore', 'internshipId', 'studentId', 'createdAt'] } },
      { resource: SavedInternship, options: { navigation: nav.marketplace } },

      { resource: Notification, options: { navigation: nav.engagement, listProperties: ['title', 'type', 'read', 'emailSent', 'createdAt'] } },
      { resource: Report, options: { navigation: nav.engagement, listProperties: ['targetType', 'reason', 'status', 'createdAt'] } },
      { resource: Certificate, options: { navigation: nav.engagement, listProperties: ['certificateId', 'studentName', 'companyName', 'revoked', 'issuedAt'] } },
      { resource: Interview, options: { navigation: nav.engagement, listProperties: ['mode', 'status', 'startAt', 'createdAt'] } },
      { resource: Referral, options: { navigation: nav.engagement } },
      { resource: ResumeVersion, options: { navigation: nav.engagement, listProperties: ['version', 'status', 'analyzedAt', 'createdAt'] } },

      { resource: ActivityLog, options: { navigation: nav.system, listProperties: ['action', 'actorRole', 'targetType', 'createdAt'] } },
    ],
  });

  if (env.nodeEnv !== 'production') {
    // Bundle the admin UI on the fly in development.
    admin.watch();
  }

  // Swaps the default login screen for one that also links back to the
  // consumer-facing app — the default has no way out for a student/company
  // user who lands here by mistake. Auth itself (action/field names) is
  // untouched; only the rendered markup changes.
  admin.overrideLogin({ component: LoginPage, props: { clientUrl: env.clientUrl } });

  const authenticate = async (email: string, password: string) => {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || user.role !== UserRole.ADMIN) return null;
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return null;
    return { email: user.email, id: user._id.toString(), role: user.role };
  };

  const router = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookieName: 'internbridge_admin',
      cookiePassword: env.adminCookieSecret,
    },
    undefined,
    {
      resave: false,
      saveUninitialized: false,
      secret: env.adminCookieSecret,
      cookie: { httpOnly: true, secure: env.isProduction },
      name: 'internbridge_admin_sid',
    }
  );

  logger.info(`AdminJS panel mounted at ${ROOT_PATH}`);
  return { admin, router };
}
