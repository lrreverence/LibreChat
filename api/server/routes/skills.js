const express = require('express');
const { ObjectId } = require('mongodb');
const { generateCheckAccess } = require('@librechat/api');
const { logger, escapeRegExp } = require('@librechat/data-schemas');
const {
  Permissions,
  ResourceType,
  AccessRoleIds,
  PrincipalType,
  PermissionBits,
  PermissionTypes,
} = require('librechat-data-provider');
const { requireJwtAuth, canAccessSkillResource } = require('~/server/middleware');
const {
  createSkill,
  getSkillById,
  updateSkill,
  deleteSkill,
  getRoleByName,
  getListSkillsByAccess,
  getSkillFolders,
  createSkillFolder,
  updateSkillFolder,
  deleteSkillFolder,
} = require('~/models');
const {
  findPubliclyAccessibleResources,
  findAccessibleResources,
  grantPermission,
} = require('~/server/services/PermissionService');

const router = express.Router();

const checkSkillAccess = generateCheckAccess({
  permissionType: PermissionTypes.SKILLS,
  permissions: [Permissions.USE],
  getRoleByName,
});

const checkSkillCreate = generateCheckAccess({
  permissionType: PermissionTypes.SKILLS,
  permissions: [Permissions.USE, Permissions.CREATE],
  getRoleByName,
});

/** Allowed fields for skill create/update — prevents mass assignment of author, tenantId, etc. */
const ALLOWED_SKILL_FIELDS = ['name', 'description', 'content', 'folderId', 'invocationMode'];

function pickAllowed(body, fields) {
  const result = {};
  for (const key of fields) {
    if (body[key] !== undefined) {
      result[key] = body[key];
    }
  }
  return result;
}

function isValidObjectId(id) {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}

router.use(requireJwtAuth);
router.use(checkSkillAccess);

/**
 * Creates a new skill.
 * @route POST /api/skills
 * @param {object} req.body - Skill creation payload (must include name and content).
 * @returns {ISkillDocument} 201 - Created skill document
 */
router.post('/', checkSkillCreate, async (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ error: 'Skill name is required and must be a non-empty string' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res
        .status(400)
        .json({ error: 'Skill content is required and must be a non-empty string' });
    }

    const allowed = pickAllowed(req.body, ALLOWED_SKILL_FIELDS);
    const result = await createSkill({
      ...allowed,
      author: req.user.id,
      authorName: req.user.name,
    });

    try {
      await grantPermission({
        principalType: PrincipalType.USER,
        principalId: req.user.id,
        resourceType: ResourceType.SKILL,
        resourceId: result._id,
        accessRoleId: AccessRoleIds.SKILL_OWNER,
        grantedBy: req.user.id,
      });
    } catch (permissionError) {
      logger.error(
        `[createSkill] Failed to grant owner permissions for skill ${result._id}:`,
        permissionError,
      );
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('[createSkill]', error);
    res.status(500).json({ error: 'Error creating skill' });
  }
});

/**
 * Lists skills with ACL-aware filtering, public skill merging, and cursor pagination.
 * @route GET /api/skills
 * @param {string} [req.query.search] - Name search filter (regex).
 * @param {string} [req.query.folderId] - Filter by folder ID.
 * @param {string} [req.query.isPublic] - Filter to public skills only ('true').
 * @param {string} [req.query.limit] - Page size for cursor pagination.
 * @param {string} [req.query.after] - Cursor for next page.
 * @returns {object} 200 - Paginated list with { object, data, first_id, last_id, has_more, after }
 */
router.get('/', async (req, res) => {
  try {
    const { search, folderId, isPublic, limit, after } = req.query;

    const [accessibleIds, publiclyAccessibleIds] = await Promise.all([
      findAccessibleResources({
        userId: req.user.id,
        role: req.user.role,
        resourceType: ResourceType.SKILL,
        requiredPermissions: PermissionBits.VIEW,
      }),
      findPubliclyAccessibleResources({
        resourceType: ResourceType.SKILL,
        requiredPermissions: PermissionBits.VIEW,
      }),
    ]);

    const publicIdSet = new Set(publiclyAccessibleIds.map((id) => id.toString()));

    const mergedIdSet = new Set();
    const mergedIds = [];
    for (const id of accessibleIds) {
      const key = id.toString();
      if (!mergedIdSet.has(key)) {
        mergedIdSet.add(key);
        mergedIds.push(id);
      }
    }
    for (const id of publiclyAccessibleIds) {
      const key = id.toString();
      if (!mergedIdSet.has(key)) {
        mergedIdSet.add(key);
        mergedIds.push(new ObjectId(key));
      }
    }

    const otherParams = {};
    if (search) {
      otherParams.name = new RegExp(escapeRegExp(search), 'i');
    }
    if (folderId) {
      otherParams.folderId = folderId;
    }
    if (isPublic === 'true') {
      otherParams.isPublic = true;
    }

    const result = await getListSkillsByAccess({
      accessibleIds: mergedIds,
      otherParams,
      limit: limit ? parseInt(limit, 10) : undefined,
      after: after || undefined,
    });

    if (!result) {
      return res.status(200).json({
        object: 'list',
        data: [],
        first_id: null,
        last_id: null,
        has_more: false,
        after: null,
      });
    }

    result.data = result.data.map((skill) => {
      if (publicIdSet.has(skill._id.toString())) {
        skill.isPublic = true;
      }
      return skill;
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error('[listSkills]', error);
    res.status(500).json({ error: 'Error listing skills' });
  }
});

/**
 * Lists skill folders for the authenticated user.
 * @route GET /api/skills/folders
 * @returns {Array} 200 - Array of folder documents
 */
router.get('/folders', async (req, res) => {
  try {
    const folders = await getSkillFolders(req.user.id);
    res.status(200).json(folders);
  } catch (error) {
    logger.error('[listSkillFolders]', error);
    res.status(500).json({ error: 'Error listing skill folders' });
  }
});

/**
 * Creates a new skill folder.
 * @route POST /api/skills/folders
 * @param {object} req.body - Must include `name`.
 * @returns {object} 200 - Created folder document
 */
router.post('/folders', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ error: 'Folder name is required and must be a non-empty string' });
    }

    const folder = await createSkillFolder({ name: name.trim(), author: req.user.id });
    res.status(200).json(folder);
  } catch (error) {
    logger.error('[createSkillFolder]', error);
    res.status(500).json({ error: 'Error creating skill folder' });
  }
});

/**
 * Updates a skill folder by ID. Only the folder author can update it.
 * @route PATCH /api/skills/folders/:folderId
 * @param {string} req.params.folderId - Folder ObjectId.
 * @param {object} req.body - Must include `name`.
 * @returns {object} 200 - Updated folder document
 */
router.patch('/folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    if (!isValidObjectId(folderId)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ error: 'Folder name is required and must be a non-empty string' });
    }

    const folder = await updateSkillFolder({
      _id: folderId,
      author: req.user.id,
      data: { name: name.trim() },
    });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json(folder);
  } catch (error) {
    logger.error('[updateSkillFolder]', error);
    res.status(500).json({ error: 'Error updating skill folder' });
  }
});

/**
 * Deletes a skill folder by ID. Only the folder author can delete it.
 * @route DELETE /api/skills/folders/:folderId
 * @param {string} req.params.folderId - Folder ObjectId.
 * @returns {object} 200 - Deletion confirmation
 */
router.delete('/folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    if (!isValidObjectId(folderId)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const result = await deleteSkillFolder({ _id: folderId, author: req.user.id });
    if (!result) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json({ message: 'Folder deleted' });
  } catch (error) {
    logger.error('[deleteSkillFolder]', error);
    res.status(500).json({ error: 'Error deleting skill folder' });
  }
});

/**
 * Gets a skill by ID.
 * @route GET /api/skills/:skillId
 * @param {string} req.params.skillId - Skill ObjectId.
 * @returns {ISkillDocument} 200 - Skill document
 */
router.get(
  '/:skillId',
  canAccessSkillResource({ requiredPermission: PermissionBits.VIEW }),
  async (req, res) => {
    try {
      const skill = await getSkillById({ _id: req.params.skillId });
      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      res.status(200).json(skill);
    } catch (error) {
      logger.error('[getSkill]', error);
      res.status(500).json({ error: 'Error getting skill' });
    }
  },
);

/**
 * Updates a skill by ID.
 * @route PATCH /api/skills/:skillId
 * @param {string} req.params.skillId - Skill ObjectId.
 * @param {object} req.body - Fields to update (name, description, content, folderId, invocationMode).
 * @returns {ISkillDocument} 200 - Updated skill document
 */
router.patch(
  '/:skillId',
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.EDIT }),
  async (req, res) => {
    try {
      const allowed = pickAllowed(req.body, ALLOWED_SKILL_FIELDS);
      const result = await updateSkill({ _id: req.params.skillId, data: allowed });
      if (!result) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      res.status(200).json(result);
    } catch (error) {
      logger.error('[updateSkill]', error);
      res.status(500).json({ error: 'Error updating skill' });
    }
  },
);

/**
 * Deletes a skill by ID.
 * @route DELETE /api/skills/:skillId
 * @param {string} req.params.skillId - Skill ObjectId.
 * @returns {object} 200 - Deletion result
 */
router.delete(
  '/:skillId',
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.DELETE }),
  async (req, res) => {
    try {
      const result = await deleteSkill({ _id: req.params.skillId });
      res.status(200).json(result);
    } catch (error) {
      logger.error('[deleteSkill]', error);
      res.status(500).json({ error: 'Error deleting skill' });
    }
  },
);

module.exports = router;
