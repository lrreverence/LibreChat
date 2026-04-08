import { ResourceType } from 'librechat-data-provider';
import type { Model, Types, FilterQuery } from 'mongoose';
import type { IAclEntry, ISkill, ISkillDocument } from '~/types';
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

/** Filter shape accepted by the list endpoint, beyond the access ID set. */
export interface SkillListFilters {
  name?: RegExp;
  category?: string;
  isPublic?: boolean;
}

/** Lean shape returned by `.lean()` queries — author/_id stay as ObjectId. */
export type ISkillLean = Omit<ISkill, 'author'> & {
  _id: Types.ObjectId;
  author: Types.ObjectId;
};

/** Public shape returned to API consumers — author serialized to string. */
export type ISkillPublic = Omit<ISkillLean, 'author'> & { author: string };

export function createSkillMethods(mongoose: typeof import('mongoose'), deps: SkillDeps) {
  const { getSoleOwnedResourceIds } = deps;
  const { ObjectId } = mongoose.Types;

  function getSkillModel(): Model<ISkillDocument> {
    return mongoose.models.Skill as Model<ISkillDocument>;
  }

  /** Create a new skill document. */
  async function createSkill(data: Partial<ISkillDocument>) {
    const Skill = getSkillModel();
    const created = await Skill.create(data);
    return created.toObject() as ISkillLean;
  }

  /** Get a skill by its ID. */
  async function getSkillById({ _id }: { _id: string | Types.ObjectId }) {
    const Skill = getSkillModel();
    return Skill.findById(_id).lean<ISkillLean | null>();
  }

  /** Update a skill by its ID. */
  async function updateSkill({ _id, data }: { _id: string; data: Partial<ISkillDocument> }) {
    const Skill = getSkillModel();
    return Skill.findByIdAndUpdate(_id, data, {
      new: true,
      runValidators: true,
    }).lean<ISkillLean | null>();
  }

  /** Delete a skill and remove all associated ACL permissions. */
  async function deleteSkill({ _id }: { _id: string }) {
    const Skill = getSkillModel();
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
    otherParams?: SkillListFilters;
    limit?: number | null;
    after?: string | null;
  }) {
    const Skill = getSkillModel();
    const isPaginated = limit !== null && limit !== undefined;
    const normalizedLimit = isPaginated ? Math.min(Math.max(1, limit ?? 20), 100) : null;

    const baseQuery: FilterQuery<ISkillDocument> = {
      ...otherParams,
      _id: { $in: accessibleIds },
    };

    let matchQuery: FilterQuery<ISkillDocument> = baseQuery;

    if (after && after !== 'undefined' && after !== 'null') {
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
          const cursorCondition: FilterQuery<ISkillDocument> = {
            $or: [
              { updatedAt: { $lt: new Date(updatedAt) } },
              {
                updatedAt: new Date(updatedAt),
                _id: { $gt: new ObjectId(_id) },
              },
            ],
          };

          matchQuery = { $and: [baseQuery, cursorCondition] };
        }
      } catch (error) {
        logger.warn('Invalid cursor:', (error as Error).message);
      }
    }

    const findQuery = Skill.find(matchQuery)
      .sort({ updatedAt: -1, _id: 1 })
      .select(
        'name description category invocationMode author authorName projectIds isPublic createdAt updatedAt',
      );

    if (isPaginated && normalizedLimit) {
      findQuery.limit(normalizedLimit + 1);
    }

    const skills = await findQuery.lean<ISkillLean[]>();

    const hasMore = isPaginated && normalizedLimit ? skills.length > normalizedLimit : false;
    const sliced = isPaginated && normalizedLimit ? skills.slice(0, normalizedLimit) : skills;

    const data: ISkillPublic[] = sliced.map((skill) => ({
      ...skill,
      author: skill.author.toString(),
    }));

    let nextCursor: string | null = null;
    if (isPaginated && hasMore && data.length > 0 && normalizedLimit) {
      const lastSkill = skills[normalizedLimit - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          updatedAt: (lastSkill.updatedAt as Date).toISOString(),
          _id: lastSkill._id.toString(),
        }),
      ).toString('base64');
    }

    return {
      object: 'list' as const,
      data,
      first_id: data.length > 0 ? data[0]._id.toString() : null,
      last_id: data.length > 0 ? data[data.length - 1]._id.toString() : null,
      has_more: hasMore,
      after: nextCursor,
    };
  }

  /**
   * Deletes skills solely owned by the user and cleans up their ACLs.
   * Wraps the multi-collection delete in a transaction so a partial failure
   * leaves neither the skills nor the ACL entries in an inconsistent state.
   */
  async function deleteUserSkills(userId: string) {
    const Skill = getSkillModel();
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const userObjectId = new ObjectId(userId);

    let allSkillIdsToDelete: Types.ObjectId[] = [];
    try {
      const soleOwnedIds = await getSoleOwnedResourceIds(userObjectId, ResourceType.SKILL);

      const distinctIds = await Skill.distinct('_id', { author: userObjectId });
      const authoredSkillIds: Types.ObjectId[] = distinctIds as unknown as Types.ObjectId[];

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

      allSkillIdsToDelete = [...soleOwnedIds, ...legacySkillIds];

      if (allSkillIdsToDelete.length === 0) {
        return;
      }
    } catch (error) {
      logger.error('[deleteUserSkills] discovery phase failed', error);
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Skill.deleteMany({ _id: { $in: allSkillIdsToDelete } }, { session });
        await AclEntry.deleteMany(
          {
            resourceType: ResourceType.SKILL,
            resourceId: { $in: allSkillIdsToDelete },
          },
          { session },
        );
      });
    } catch (error) {
      logger.error('[deleteUserSkills] transaction failed', error);
    } finally {
      await session.endSession();
    }
  }

  return {
    createSkill,
    getSkillById,
    updateSkill,
    deleteSkill,
    getListSkillsByAccess,
    deleteUserSkills,
  };
}

export type SkillMethods = ReturnType<typeof createSkillMethods>;
