import type { Document, Types } from 'mongoose';

export interface ISkill {
  name: string;
  description: string;
  category?: string;
  invocationMode: 'auto' | 'manual' | 'both';
  author: Types.ObjectId;
  authorName: string;
  projectIds?: string[];
  isPublic?: boolean;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISkillDocument extends ISkill, Document {}
