import type { Model, Types } from 'mongoose';
import type { ISkillNodeDocument } from '~/types';
import logger from '~/config/winston';

export interface SkillNodeDeps {
  /** Removes a stored file by its file_id. Injected from FileMethods. */
  deleteFile: (file_id: string) => Promise<unknown>;
}

export function createSkillNodeMethods(mongoose: typeof import('mongoose'), deps: SkillNodeDeps) {
  function getModel(): Model<ISkillNodeDocument> {
    return mongoose.models.SkillNode as Model<ISkillNodeDocument>;
  }

  async function getSkillTree({ skillId }: { skillId: string }) {
    const SkillNode = getModel();
    return SkillNode.find({ skillId }).sort({ order: 1, name: 1 }).lean();
  }

  async function getSkillNode({ _id }: { _id: string | Types.ObjectId }) {
    const SkillNode = getModel();
    return SkillNode.findById(_id).lean();
  }

  async function createSkillNode(data: Partial<ISkillNodeDocument>) {
    const SkillNode = getModel();
    const created = await SkillNode.create(data);
    return created.toObject();
  }

  async function updateSkillNode({
    _id,
    data,
  }: {
    _id: string | Types.ObjectId;
    data: Partial<ISkillNodeDocument>;
  }) {
    const SkillNode = getModel();
    return SkillNode.findByIdAndUpdate(_id, data, { new: true, runValidators: true }).lean();
  }

  /**
   * Resolves all descendant nodes (including the root) of a folder via a single
   * `$graphLookup` aggregation, replacing the previous recursive find/delete loop.
   */
  async function collectSubtree(
    rootId: unknown,
  ): Promise<Pick<ISkillNodeDocument, '_id' | 'type' | 'fileId'>[]> {
    const SkillNode = getModel();
    const result = await SkillNode.aggregate<{
      _id: Types.ObjectId;
      descendants: Pick<ISkillNodeDocument, '_id' | 'type' | 'fileId'>[];
    }>([
      { $match: { _id: rootId } },
      {
        $graphLookup: {
          from: SkillNode.collection.name,
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'descendants',
        },
      },
      { $project: { _id: 1, descendants: { _id: 1, type: 1, fileId: 1 } } },
    ]);

    if (result.length === 0) {
      return [];
    }
    const root = result[0];
    return [
      { _id: root._id, type: 'folder', fileId: undefined } as Pick<
        ISkillNodeDocument,
        '_id' | 'type' | 'fileId'
      >,
      ...root.descendants,
    ];
  }

  async function deleteFilesInParallel(fileIds: string[]) {
    if (fileIds.length === 0) {
      return;
    }
    const results = await Promise.allSettled(fileIds.map((id) => deps.deleteFile(id)));
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error('[deleteSkillNodes] deleteFile rejected', result.reason);
      }
    }
  }

  async function deleteSkillNode({ _id }: { _id: string }) {
    const SkillNode = getModel();
    const node = await SkillNode.findById(_id).lean<ISkillNodeDocument | null>();
    if (!node) {
      return { message: 'Node not found' };
    }

    if (node.type === 'folder') {
      const subtree = await collectSubtree(node._id as Types.ObjectId);
      const fileIds: string[] = [];
      const idsToDelete: Types.ObjectId[] = [];
      for (const n of subtree) {
        idsToDelete.push(n._id as Types.ObjectId);
        if (n.type === 'file' && n.fileId) {
          fileIds.push(n.fileId);
        }
      }
      await deleteFilesInParallel(fileIds);
      await SkillNode.deleteMany({ _id: { $in: idsToDelete } });
      return { message: 'Node deleted successfully' };
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

  async function deleteSkillNodes({ skillId }: { skillId: string }) {
    const SkillNode = getModel();
    const nodes = await SkillNode.find({
      skillId,
      type: 'file',
      fileId: { $exists: true },
    })
      .select('fileId')
      .lean();
    const fileIds: string[] = [];
    for (const node of nodes) {
      if (node.fileId) {
        fileIds.push(node.fileId);
      }
    }
    await deleteFilesInParallel(fileIds);
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
