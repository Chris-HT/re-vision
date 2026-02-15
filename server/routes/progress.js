import express from 'express';
import {
  getProgress, recordCardReview, getDueCards, getDetailedStats
} from '../dal/progress.js';
import { awardXP, awardCoins, checkAndUnlockAchievements } from '../dal/gamification.js';
import { canAccessProfile } from '../middleware/auth.js';

const router = express.Router();

// GET /api/progress/:profileId
router.get('/progress/:profileId', (req, res, next) => {
  try {
    if (!canAccessProfile(req.user, req.params.profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const progress = getProgress(req.params.profileId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

// PUT /api/progress/:profileId/card/:cardId
router.put('/progress/:profileId/card/:cardId', (req, res, next) => {
  try {
    const { profileId, cardId } = req.params;
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { result } = req.body;

    if (!['correct', 'incorrect', 'skipped'].includes(result)) {
      return res.status(400).json({ error: 'result must be "correct", "incorrect", or "skipped"' });
    }

    const { card, stats } = recordCardReview(profileId, cardId, result);

    // Gamification: award XP/coins per card review
    const xpAmount = result === 'correct' ? 10 : 3;
    const coinAmount = result === 'correct' ? 5 : 0;
    const xpResult = awardXP(profileId, xpAmount);
    let coinsResult = null;
    if (coinAmount > 0) {
      coinsResult = awardCoins(profileId, coinAmount, 'card-review');
    }
    const newAchievements = checkAndUnlockAchievements(profileId);

    res.json({ success: true, card, stats, gamification: { xp: xpResult, coins: coinsResult, newAchievements } });
  } catch (error) {
    next(error);
  }
});

// GET /api/progress/:profileId/due?themes=theme1,theme2&limit=30
router.get('/progress/:profileId/due', (req, res, next) => {
  try {
    const { profileId } = req.params;
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { themes, limit } = req.query;
    const themeList = themes ? themes.split(',') : null;
    const maxCards = limit ? parseInt(limit) : 30;

    const result = getDueCards(profileId, themeList, maxCards);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/progress/:profileId/stats
router.get('/progress/:profileId/stats', (req, res, next) => {
  try {
    const { profileId } = req.params;
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const stats = getDetailedStats(profileId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
