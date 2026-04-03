const express = require('express');
const { generateCheckAccess } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const {
  Permissions,
  ResourceType,
  AccessRoleIds,
  PrincipalType,
  PermissionBits,
  PermissionTypes,
} = require('librechat-data-provider');
const { requireJwtAuth, canAccessSkillResource } = require('~/server/middleware');
const { createSkill, getSkillById, updateSkill, deleteSkill, getRoleByName } = require('~/models');
const { grantPermission } = require('~/server/services/PermissionService');

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

router.use(requireJwtAuth);
router.use(checkSkillAccess);

/**
 * Creates a new skill.
 * @route POST /api/skills
 * @param {object} req.body - Skill creation payload (must include name).
 * @returns {ISkillDocument} 201 - Created skill document
 */
router.post('/', checkSkillCreate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Skill name is required and must be a non-empty string' });
    }

    const result = await createSkill({
      ...req.body,
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
 * @param {object} req.body - Fields to update.
 * @returns {ISkillDocument} 200 - Updated skill document
 */
router.patch(
  '/:skillId',
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.EDIT }),
  async (req, res) => {
    try {
      const result = await updateSkill({ _id: req.params.skillId, data: req.body });
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
