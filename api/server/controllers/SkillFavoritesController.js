const { logger } = require('@librechat/data-schemas');
const { updateUser, getUserById } = require('~/models');

/** Maximum number of skills a user can favorite. */
const MAX_SKILL_FAVORITES = 50;
const SKILL_ID_MAX_LENGTH = 64;
const SKILL_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

const updateSkillFavoritesController = async (req, res) => {
  try {
    const { skillFavorites } = req.body;
    const userId = req.user.id;

    if (skillFavorites == null) {
      return res.status(400).json({ message: 'skillFavorites data is required' });
    }

    if (!Array.isArray(skillFavorites)) {
      return res.status(400).json({ message: 'skillFavorites must be an array' });
    }

    if (skillFavorites.length > MAX_SKILL_FAVORITES) {
      return res.status(400).json({
        code: 'MAX_SKILL_FAVORITES_EXCEEDED',
        message: `Maximum ${MAX_SKILL_FAVORITES} skill favorites allowed`,
        limit: MAX_SKILL_FAVORITES,
      });
    }

    const seen = new Set();
    const cleaned = [];
    for (const id of skillFavorites) {
      if (typeof id !== 'string') {
        return res.status(400).json({ message: 'Each skill favorite must be a string ID' });
      }
      if (id.length > SKILL_ID_MAX_LENGTH || !SKILL_ID_PATTERN.test(id)) {
        return res.status(400).json({ message: 'Invalid skill ID format' });
      }
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      cleaned.push(id);
    }

    const user = await updateUser(userId, { skillFavorites: cleaned });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.skillFavorites ?? []);
  } catch (error) {
    logger.error('[updateSkillFavorites]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getSkillFavoritesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId, 'skillFavorites');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const skillFavorites = Array.isArray(user.skillFavorites) ? user.skillFavorites : [];
    res.status(200).json(skillFavorites);
  } catch (error) {
    logger.error('[getSkillFavorites]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  updateSkillFavoritesController,
  getSkillFavoritesController,
  MAX_SKILL_FAVORITES,
};
