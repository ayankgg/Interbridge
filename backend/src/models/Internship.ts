import { Schema, model, Document, Types } from 'mongoose';
import { InternshipStatus, Proficiency } from '../types';

export interface IRequiredSkill {
  skillId: string;
  name: string;
  weight: number;
  minProficiency: Proficiency;
}

export interface IInternship extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  description: string;
  role?: string;
  requiredSkills: IRequiredSkill[];
  niceToHaveSkills: { skillId: string; name: string }[];
  eligibility: { minYear?: number; maxYear?: number };
  location: { city?: string; remoteOk: boolean };
  stipend: { amount: number; currency: string; period: string };
  duration?: string;
  openings: number;
  deadline?: Date;
  status: InternshipStatus;
  stats: { views: number; applications: number; shortlists: number };
  createdAt: Date;
  updatedAt: Date;
}

const requiredSkillSchema = new Schema<IRequiredSkill>(
  {
    skillId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    weight: { type: Number, default: 1, min: 0.1, max: 5 },
    minProficiency: {
      type: String,
      enum: Object.values(Proficiency),
      default: Proficiency.BEGINNER,
    },
  },
  { _id: false }
);

const internshipSchema = new Schema<IInternship>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160, index: true },
    description: { type: String, required: true, maxlength: 8000 },
    role: { type: String, trim: true },
    requiredSkills: { type: [requiredSkillSchema], default: [] },
    niceToHaveSkills: [
      {
        _id: false,
        skillId: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
    eligibility: {
      minYear: { type: Number, min: 1, max: 6 },
      maxYear: { type: Number, min: 1, max: 6 },
    },
    location: {
      city: { type: String, trim: true },
      remoteOk: { type: Boolean, default: false },
    },
    stipend: {
      amount: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'INR' },
      period: { type: String, default: 'month' },
    },
    duration: { type: String, trim: true },
    openings: { type: Number, default: 1, min: 1 },
    deadline: { type: Date },
    status: {
      type: String,
      enum: Object.values(InternshipStatus),
      default: InternshipStatus.ACTIVE,
      index: true,
    },
    stats: {
      views: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      shortlists: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

internshipSchema.index({ status: 1, deadline: 1 });
internshipSchema.index({ 'requiredSkills.skillId': 1 });
internshipSchema.index({ companyId: 1, status: 1 });
internshipSchema.index({ 'location.city': 1, 'location.remoteOk': 1 });
internshipSchema.index({ status: 1, 'location.city': 1, 'requiredSkills.skillId': 1 });
internshipSchema.index({ title: 'text', description: 'text', role: 'text' });

export const Internship = model<IInternship>('Internship', internshipSchema);
export default Internship;
