import { Schema, model, Document, Types } from 'mongoose';
import { Proficiency } from '../types';

export interface ISkill {
  skillId: string;
  name: string;
  proficiency: Proficiency;
  selfRating?: number;
}

export interface IEducation {
  degree: string;
  college: string;
  startYear?: number;
  endYear?: number;
  gpa?: number;
}

export interface IProject {
  title: string;
  description?: string;
  techStack: string[];
  link?: string;
}

export interface ICertification {
  name: string;
  issuer?: string;
  url?: string;
  date?: Date;
}

export interface IStudent extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  headline?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: Date;
  location: { city?: string; country?: string; remoteOk: boolean };
  yearOfStudy?: number;
  college?: string;
  bio?: string;
  links: { github?: string; portfolio?: string; linkedin?: string };
  skills: ISkill[];
  education: IEducation[];
  projects: IProject[];
  certifications: ICertification[];
  resume: {
    fileUrl?: string;
    publicId?: string;
    parsedText?: string;
    parseStatus: 'none' | 'pending' | 'done' | 'failed';
    version: number;
    uploadedAt?: Date;
  };
  profileCompleteness: number;
  jobSeekingStatus: 'active' | 'passive' | 'closed';
  consent: { candidateDiscovery: boolean; dataProcessing: boolean };
  // V2: public portfolio (optional, backward-compatible)
  slug?: string;
  publicProfile: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const skillSchema = new Schema<ISkill>(
  {
    skillId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    proficiency: {
      type: String,
      enum: Object.values(Proficiency),
      default: Proficiency.BEGINNER,
    },
    selfRating: { type: Number, min: 1, max: 5 },
  },
  { _id: false }
);

const educationSchema = new Schema<IEducation>(
  {
    degree: { type: String, required: true, trim: true },
    college: { type: String, required: true, trim: true },
    startYear: Number,
    endYear: Number,
    gpa: { type: Number, min: 0, max: 10 },
  },
  { _id: false }
);

const projectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 2000 },
    techStack: [{ type: String, trim: true }],
    link: { type: String, trim: true },
  },
  { _id: false }
);

const certificationSchema = new Schema<ICertification>(
  {
    name: { type: String, required: true, trim: true },
    issuer: String,
    url: String,
    date: Date,
  },
  { _id: false }
);

const studentSchema = new Schema<IStudent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    headline: { type: String, trim: true, maxlength: 160 },
    avatarUrl: { type: String },
    avatarPublicId: { type: String },
    phone: { type: String, trim: true, maxlength: 20 },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    dateOfBirth: { type: Date },
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true },
      remoteOk: { type: Boolean, default: true },
    },
    yearOfStudy: { type: Number, min: 1, max: 6 },
    college: { type: String, trim: true },
    bio: { type: String, maxlength: 2000 },
    links: {
      github: String,
      portfolio: String,
      linkedin: String,
    },
    skills: { type: [skillSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    resume: {
      fileUrl: String,
      publicId: String,
      parsedText: { type: String, select: false },
      parseStatus: {
        type: String,
        enum: ['none', 'pending', 'done', 'failed'],
        default: 'none',
      },
      version: { type: Number, default: 0 },
      uploadedAt: Date,
    },
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
    jobSeekingStatus: {
      type: String,
      enum: ['active', 'passive', 'closed'],
      default: 'active',
      index: true,
    },
    consent: {
      candidateDiscovery: { type: Boolean, default: true },
      dataProcessing: { type: Boolean, default: true },
    },
    slug: { type: String, unique: true, sparse: true },
    publicProfile: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

studentSchema.index({ 'skills.skillId': 1 });
studentSchema.index({ 'location.city': 1, jobSeekingStatus: 1 });
studentSchema.index({ yearOfStudy: 1 });
studentSchema.index({ headline: 'text', bio: 'text' });

export const Student = model<IStudent>('Student', studentSchema);
export default Student;
