import { Schema } from 'mongoose';
import type { ISkillDocument } from '~/types';

const skillSchema = new Schema<ISkillDocument>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: '',
      index: true,
    },
    invocationMode: {
      type: String,
      enum: ['auto', 'manual', 'both'],
      default: 'auto',
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    projectIds: {
      type: [String],
    },
    isPublic: {
      type: Boolean,
      default: false,
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

skillSchema.index({ updatedAt: -1, _id: 1 });
skillSchema.index({ author: 1, updatedAt: -1 });

export default skillSchema;
