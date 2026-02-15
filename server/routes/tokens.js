import express from 'express';
import {
  getProfileTokens, getTokenTransactions, getChildTokenSummaries, setTokenRate
} from '../dal/tokens.js';
import { canAccessProfile, requireRole } from '../middleware/auth.js';
import { getChildren } from '../dal/auth.js';

const router = express.Router();

// GET /api/tokens/children/summary — all children's token summaries (admin/parent)
// Must be before /:profileId to avoid "children" matching as a profileId
router.get('/children/summary', requireRole('admin', 'parent'), (req, res, next) => {
  try {
    const children = getChildren(req.user.profileId, req.user.role);
    const childIds = children.map(c => c.id);
    const summaries = getChildTokenSummaries(childIds);
    res.json({ summaries });
  } catch (error) {
    next(error);
  }
});

// GET /api/tokens/:profileId — token balance + daily info
router.get('/:profileId', (req, res, next) => {
  try {
    if (!canAccessProfile(req.user, req.params.profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const data = getProfileTokens(req.params.profileId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/tokens/:profileId/transactions — transaction history
router.get('/:profileId/transactions', (req, res, next) => {
  try {
    if (!canAccessProfile(req.user, req.params.profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const transactions = getTokenTransactions(req.params.profileId, limit);
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tokens/:profileId/rate — set conversion rate (admin/parent only)
router.put('/:profileId/rate', requireRole('admin', 'parent'), (req, res, next) => {
  try {
    if (!canAccessProfile(req.user, req.params.profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { rate } = req.body;
    if (typeof rate !== 'number' || rate < 0 || rate > 10) {
      return res.status(400).json({ error: 'Rate must be between 0 and 10' });
    }
    setTokenRate(req.params.profileId, rate);
    res.json({ success: true, rate });
  } catch (error) {
    next(error);
  }
});

export default router;
