import { Schema } from 'mongoose';
import type { ISkillFolderDocument } from '~/types';

const skillFolderSchema = new Schema<ISkillFolderDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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

export default skillFolderSchema;
