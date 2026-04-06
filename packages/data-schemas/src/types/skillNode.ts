import type { Document, Types } from 'mongoose';

export interface ISkillNode {
  skillId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  type: 'file' | 'folder';
  name: string;
  fileId?: string;
  order: number;
  author: Types.ObjectId;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISkillNodeDocument extends ISkillNode, Document {}
