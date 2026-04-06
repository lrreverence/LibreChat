import { Schema } from 'mongoose';
import type { ISkillNodeDocument } from '~/types';

const skillNodeSchema = new Schema<ISkillNodeDocument>(
  {
    skillId: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'SkillNode',
      default: null,
    },
    type: {
      type: String,
      enum: ['file', 'folder'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    fileId: {
      type: String,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

skillNodeSchema.index({ skillId: 1, parentId: 1 });

export default skillNodeSchema;
