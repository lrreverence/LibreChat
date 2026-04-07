const express = require('express');
const {
  updateFavoritesController,
  getFavoritesController,
} = require('~/server/controllers/FavoritesController');
const {
  updateSkillFavoritesController,
  getSkillFavoritesController,
} = require('~/server/controllers/SkillFavoritesController');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.get('/favorites', requireJwtAuth, getFavoritesController);
router.post('/favorites', requireJwtAuth, updateFavoritesController);

router.get('/favorites/skills', requireJwtAuth, getSkillFavoritesController);
router.post('/favorites/skills', requireJwtAuth, updateSkillFavoritesController);

module.exports = router;
