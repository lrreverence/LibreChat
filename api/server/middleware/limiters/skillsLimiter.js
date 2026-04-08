const rateLimit = require('express-rate-limit');
const { limiterCache } = require('@librechat/api');

const SKILLS_WINDOW_MS = 60 * 1000;
const SKILLS_MAX = 60;

const skillsLimiter = rateLimit({
  windowMs: SKILLS_WINDOW_MS,
  max: SKILLS_MAX,
  handler: (_req, res) => {
    res.status(429).json({ message: 'Too many skill requests. Try again later' });
  },
  keyGenerator: (req) => req.user?.id,
  store: limiterCache('skills_limiter'),
});

module.exports = { skillsLimiter };
