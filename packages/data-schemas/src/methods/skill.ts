import { ResourceType } from 'librechat-data-provider';
import type { Model, Types } from 'mongoose';
import type { IAclEntry, ISkillDocument, ISkillFolderDocument } from '~/types';
import { isValidObjectIdString } from '~/utils/objectId';
import logger from '~/config/winston';

export interface SkillDeps {
  /** Removes all ACL permissions for a resource. Injected from PermissionService. */
  removeAllPermissions: (params: { resourceType: string; resourceId: unknown }) => Promise<void>;
  /** Returns resource IDs solely owned by the given user. From createAclEntryMethods. */
  getSoleOwnedResourceIds: (
    userObjectId: Types.ObjectId,
    resourceTypes: string | string[],
  ) => Promise<Types.ObjectId[]>;
}

export function createSkillMethods(mongoose: typeof import('mongoose'), deps: SkillDeps) {
  const { getSoleOwnedResourceIds } = deps;
  const { ObjectId } = mongoose.Types;

  /**
   * Create a new skill document.
   */
  async function createSkill(data: Partial<ISkillDocument>) {
    const Skill = mongoose.models.Skill as Model<ISkillDocument>;
    const created = await Skill.create(data);
    return Skill.findById(created._id).lean();
  }

  /**
   * Get a skill by its ID.
   */
  async function getSkillById({ _id }: { _id: string }) {
    const Skill = mongoose.models.Skill as Model<ISkillDocument>;
    return Skill.findById(_id).lean();
  }

  /**
   * Update a skill by its ID.
   */
  async function updateSkill({ _id, data }: { _id: string; data: Partial<ISkillDocument> }) {
    const Skill = mongoose.models.Skill as Model<ISkillDocument>;
    return Skill.findByIdAndUpdate(_id, data, { new: true }).lean();
  }

  /**
   * Delete a skill and remove all associated ACL permissions.
   */
  async function deleteSkill({ _id }: { _id: string }) {
    const Skill = mongoose.models.Skill as Model<ISkillDocument>;
    const response = await Skill.deleteOne({ _id });

    if (!response || response.deletedCount === 0) {
      throw new Error('Skill not found');
    }

    try {
      await deps.removeAllPermissions({
        resourceType: ResourceType.SKILL,
        resourceId: _id,
      });
    } catch (error) {
      logger.error('Error removing skill permissions:', error);
    }

    return { message: 'Skill deleted successfully' };
  }

  /**
   * Get skills by accessible IDs with optional cursor-based pagination.
   * Sorts by updatedAt desc, _id asc.
   */
  async function getListSkillsByAccess({
    accessibleIds = [],
    otherParams = {},
    limit = null,
    after = null,
  }: {
    accessibleIds?: Types.ObjectId[];
    otherParams?: Record<string, unknown>;
    limit?: number | null;
    after?: string | null;
  }) {
    const Skill = mongoose.models.Skill as Model<ISkillDocument>;
    const isPaginated = limit !== null && limit !== undefined;
    const normalizedLimit = isPaginated
      ? Math.min(Math.max(1, parseInt(String(limit)) || 20), 100)
      : null;

    const baseQuery: Record<string, unknown> = {
      ...otherParams,
      _id: { $in: accessibleIds },
    };

    let matchQuery: Record<string, unknown> = baseQuery;

    if (after && typeof after === 'string' && after !== 'undefined' && after !== 'null') {
      try {
        const cursor = JSON.parse(Buffer.from(after, 'base64').toString('utf8'));
        const { updatedAt, _id } = cursor;

        if (
          typeof updatedAt !== 'string' ||
          Number.isNaN(new Date(updatedAt).getTime()) ||
          typeof _id !== 'string' ||
          !isValidObjectIdString(_id)
        ) {
          logger.warn('[getListSkillsByAccess] Invalid cursor fields, skipping cursor condition');
        } else {
          const cursorCondition = {
            $or: [
              { updatedAt: { $lt: new Date(updatedAt) } },
              {
                updatedAt: new Date(updatedAt),
                _id: { $gt: new ObjectId(_id) },
              },
            ],
          };

          matchQuery =
            Object.keys(baseQuery).length > 0
              ? { $and: [baseQuery, cursorCondition] }
              : cursorCondition;
        }
      } catch (error) {
        logger.warn('Invalid cursor:', (error as Error).message);
      }
    }

    const findQuery = Skill.find(matchQuery)
      .sort({ updatedAt: -1, _id: 1 })
      .select(
        'name description content folderId invocationMode author authorName projectIds isPublic createdAt updatedAt',
      );

    if (isPaginated && normalizedLimit) {
      findQuery.limit(normalizedLimit + 1);
    }

    const skills = await findQuery.lean();

    const hasMore = isPaginated && normalizedLimit ? skills.length > normalizedLimit : false;
    const data = (isPaginated && normalizedLimit ? skills.slice(0, normalizedLimit) : skills).map(
      (skill) => {
        const mapped = skill as Record<string, unknown>;
        if (mapped.author) {
          mapped.author = (mapped.author as Types.ObjectId).toString();
        }
        return mapped;
      },
    );

    let nextCursor: string | null = null;
    if (isPaginated && hasMore && data.length > 0 && normalizedLimit) {
      const lastSkill = skills[normalizedLimit - 1] as Record<string, unknown>;
      nextCursor = Buffer.from(
        JSON.stringify({
          updatedAt: (lastSkill.updatedAt as Date).toISOString(),
          _id: (lastSkill._id as Types.ObjectId).toString(),
        }),
      ).toString('base64');
    }

    return {
      object: 'list' as const,
      data,
      first_id: data.length > 0 ? (data[0]._id as Types.ObjectId).toString() : null,
      last_id: data.length > 0 ? (data[data.length - 1]._id as Types.ObjectId).toString() : null,
      has_more: hasMore,
      after: nextCursor,
    };
  }

  /**
   * Deletes skills solely owned by the user and cleans up their ACLs and folders.
   * Groups with other owners are left intact; the caller is responsible for
   * removing the user's own ACL principal entries separately.
   *
   * Also handles legacy (pre-ACL) skills that only have the author field set,
   * ensuring they are not orphaned if the permission migration has not been run.
   */
  async function deleteUserSkills(userId: string) {
    try {
      const Skill = mongoose.models.Skill as Model<ISkillDocument>;
      const SkillFolder = mongoose.models.SkillFolder as Model<ISkillFolderDocument>;
      const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;

      const userObjectId = new ObjectId(userId);
      const soleOwnedIds = await getSoleOwnedResourceIds(userObjectId, ResourceType.SKILL);

      const authoredSkills = await Skill.find({ author: userObjectId }).select('_id').lean();
      const authoredSkillIds = authoredSkills.map((s) => s._id);

      const migratedEntries =
        authoredSkillIds.length > 0
          ? await AclEntry.find({
              resourceType: ResourceType.SKILL,
              resourceId: { $in: authoredSkillIds },
            })
              .select('resourceId')
              .lean()
          : [];
      const migratedIds = new Set(migratedEntries.map((e) => e.resourceId.toString()));
      const legacySkillIds = authoredSkillIds.filter((id) => !migratedIds.has(id.toString()));

      const allSkillIdsToDelete = [...soleOwnedIds, ...legacySkillIds];

      if (allSkillIdsToDelete.length === 0) {
        return;
      }

      await AclEntry.deleteMany({
        resourceType: ResourceType.SKILL,
        resourceId: { $in: allSkillIdsToDelete },
      });

      await Skill.deleteMany({ _id: { $in: allSkillIdsToDelete } });
      await SkillFolder.deleteMany({ author: userObjectId });
    } catch (error) {
      logger.error('[deleteUserSkills] General error:', error);
    }
  }

  /**
   * Get all skill folders for a user, sorted by name.
   */
  async function getSkillFolders(author: string) {
    const SkillFolder = mongoose.models.SkillFolder as Model<ISkillFolderDocument>;
    return SkillFolder.find({ author: new ObjectId(author) })
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Create a new skill folder.
   */
  async function createSkillFolder(data: Partial<ISkillFolderDocument>) {
    const SkillFolder = mongoose.models.SkillFolder as Model<ISkillFolderDocument>;
    const created = await SkillFolder.create(data);
    return SkillFolder.findById(created._id).lean();
  }

  /**
   * Update a skill folder by its ID. Scoped by author for ownership enforcement.
   */
  async function updateSkillFolder({
    _id,
    author,
    data,
  }: {
    _id: string;
    author: string;
    data: Partial<ISkillFolderDocument>;
  }) {
    const SkillFolder = mongoose.models.SkillFolder as Model<ISkillFolderDocument>;
    return SkillFolder.findOneAndUpdate({ _id, author: new ObjectId(author) }, data, {
      new: true,
    }).lean();
  }

  /**
   * Delete a skill folder and unset folderId on any skills referencing it.
   * Scoped by author for ownership enforcement. Returns null if the folder
   * does not exist or is not owned by the given author.
   */
  async function deleteSkillFolder({ _id, author }: { _id: string; author: string }) {
    const Skill = mongoose.models.Skill as Model<ISkillDocument>;
    const SkillFolder = mongoose.models.SkillFolder as Model<ISkillFolderDocument>;

    const result = await SkillFolder.findOneAndDelete({ _id, author: new ObjectId(author) }).lean();
    if (!result) {
      return null;
    }

    await Skill.updateMany({ folderId: _id }, { $unset: { folderId: '' } });
    return { message: 'Skill folder deleted successfully' };
  }

  return {
    createSkill,
    getSkillById,
    updateSkill,
    deleteSkill,
    getListSkillsByAccess,
    deleteUserSkills,
    getSkillFolders,
    createSkillFolder,
    updateSkillFolder,
    deleteSkillFolder,
  };
}

export type SkillMethods = ReturnType<typeof createSkillMethods>;
