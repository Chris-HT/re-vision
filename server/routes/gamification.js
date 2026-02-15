import express from 'express';
import {
  getGamificationSummary, awardXP, awardCoins, awardSubjectXP,
  checkAndUnlockAchievements, getProfileAchievements
} from '../dal/gamification.js';
import { canAccessProfile } from '../middleware/auth.js';

const router = express.Router();

// GET /api/gamification/:profileId — full summary
router.get('/:profileId', (req, res, next) => {
  try {
    if (!canAccessProfile(req.user, req.params.profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const summary = getGamificationSummary(req.params.profileId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// POST /api/gamification/:profileId/award — award XP and/or coins
router.post('/:profileId/award', (req, res, next) => {
  try {
    const { profileId } = req.params;
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { xp, coins, reason, subjectId } = req.body;
    let xpResult = null;
    let coinsResult = null;

    if (xp && xp > 0) {
      xpResult = awardXP(profileId, xp);
      if (subjectId) {
        awardSubjectXP(profileId, subjectId, xp);
      }
    }

    if (coins && coins > 0) {
      coinsResult = awardCoins(profileId, coins, reason || 'study');
    }

    const newAchievements = checkAndUnlockAchievements(profileId);

    res.json({
      xp: xpResult,
      coins: coinsResult,
      newAchievements
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/gamification/:profileId/achievements — all achievements with unlock status
router.get('/:profileId/achievements', (req, res, next) => {
  try {
    if (!canAccessProfile(req.user, req.params.profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const achievements = getProfileAchievements(req.params.profileId);
    res.json({ achievements });
  } catch (error) {
    next(error);
  }
});

export default router;
