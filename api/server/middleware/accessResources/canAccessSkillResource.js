const { ResourceType } = require('librechat-data-provider');
const { canAccessResource } = require('./canAccessResource');
const { getSkillById } = require('~/models');

/**
 * Skill ID resolver function
 * Resolves skill ID (ObjectId string) to the skill document.
 *
 * @param {string} skillId - Skill ObjectId string from route parameter
 * @returns {Promise<Object|null>} Skill document with _id field, or null if not found
 */
const resolveSkillId = async (skillId) => {
  return await getSkillById({ _id: skillId });
};

/**
 * Skill-specific middleware factory that creates middleware to check skill access permissions.
 *
 * @param {Object} options - Configuration options
 * @param {number} options.requiredPermission - The permission bit required (1=view, 2=edit, 4=delete, 8=share)
 * @param {string} [options.resourceIdParam='skillId'] - The name of the route parameter containing the skill ID
 * @returns {Function} Express middleware function
 */
const canAccessSkillResource = (options) => {
  const { requiredPermission, resourceIdParam = 'skillId' } = options;

  if (!requiredPermission || typeof requiredPermission !== 'number') {
    throw new Error('canAccessSkillResource: requiredPermission is required and must be a number');
  }

  return canAccessResource({
    resourceType: ResourceType.SKILL,
    requiredPermission,
    resourceIdParam,
    idResolver: resolveSkillId,
  });
};

module.exports = {
  canAccessSkillResource,
};
