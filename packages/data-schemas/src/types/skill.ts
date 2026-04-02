import type { Document, Types } from 'mongoose';

export interface ISkill {
  name: string;
  description: string;
  content: string;
  folderId?: Types.ObjectId;
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

export interface ISkillFolder {
  name: string;
  author: Types.ObjectId;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISkillFolderDocument extends ISkillFolder, Document {}
