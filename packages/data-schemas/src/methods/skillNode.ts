import type { Model } from 'mongoose';
import type { ISkillNodeDocument } from '~/types';
import logger from '~/config/winston';

export interface SkillNodeDeps {
  deleteFile: (file_id: string) => Promise<unknown>;
}

export function createSkillNodeMethods(mongoose: typeof import('mongoose'), deps: SkillNodeDeps) {
  function getModel() {
    return mongoose.models.SkillNode as Model<ISkillNodeDocument>;
  }

  async function getSkillTree({ skillId }: { skillId: string }) {
    const SkillNode = getModel();
    return SkillNode.find({ skillId }).sort({ order: 1, name: 1 }).lean();
  }

  async function getSkillNode({ _id }: { _id: string }) {
    const SkillNode = getModel();
    return SkillNode.findById(_id).lean();
  }

  async function createSkillNode(data: Partial<ISkillNodeDocument>) {
    const SkillNode = getModel();
    const created = await SkillNode.create(data);
    return SkillNode.findById(created._id).lean();
  }

  async function updateSkillNode({
    _id,
    data,
  }: {
    _id: string;
    data: Partial<ISkillNodeDocument>;
  }) {
    const SkillNode = getModel();
    return SkillNode.findByIdAndUpdate(_id, data, { new: true }).lean();
  }

  async function deleteSkillNode({ _id }: { _id: string }) {
    const SkillNode = getModel();
    const node = await SkillNode.findById(_id).lean();
    if (!node) {
      return { message: 'Node not found' };
    }

    if (node.type === 'folder') {
      await deleteDescendants(node._id, SkillNode);
    }

    if (node.type === 'file' && node.fileId) {
      try {
        await deps.deleteFile(node.fileId);
      } catch (err) {
        logger.error('[deleteSkillNode] Failed to delete file', err);
      }
    }

    await SkillNode.deleteOne({ _id: node._id });
    return { message: 'Node deleted successfully' };
  }

  async function deleteDescendants(parentId: unknown, SkillNode: Model<ISkillNodeDocument>) {
    const children = await SkillNode.find({ parentId }).lean();
    for (const child of children) {
      if (child.type === 'folder') {
        await deleteDescendants(child._id, SkillNode);
      }
      if (child.type === 'file' && child.fileId) {
        try {
          await deps.deleteFile(child.fileId);
        } catch (err) {
          logger.error('[deleteDescendants] Failed to delete file', err);
        }
      }
      await SkillNode.deleteOne({ _id: child._id });
    }
  }

  async function deleteSkillNodes({ skillId }: { skillId: string }) {
    const SkillNode = getModel();
    const nodes = await SkillNode.find({
      skillId,
      type: 'file',
      fileId: { $exists: true },
    }).lean();
    for (const node of nodes) {
      if (node.fileId) {
        try {
          await deps.deleteFile(node.fileId);
        } catch (err) {
          logger.error('[deleteSkillNodes] Failed to delete file', err);
        }
      }
    }
    await SkillNode.deleteMany({ skillId });
    return { message: 'All skill nodes deleted' };
  }

  return {
    getSkillTree,
    getSkillNode,
    createSkillNode,
    updateSkillNode,
    deleteSkillNode,
    deleteSkillNodes,
  };
}

export type SkillNodeMethods = ReturnType<typeof createSkillNodeMethods>;
