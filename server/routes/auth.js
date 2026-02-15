import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getProfileForLogin, setPin, getLoginProfiles, getChildren } from '../dal/auth.js';
import { authenticate, requireRole, getJwtSecret } from '../middleware/auth.js';

const router = express.Router();

// In-memory login rate limiter: profileId → { failures, lockedUntil }
const loginAttempts = new Map();

function checkLoginLock(profileId) {
  const entry = loginAttempts.get(profileId);
  if (!entry) return false;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) return true;
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(profileId);
    return false;
  }
  return false;
}

function recordFailure(profileId) {
  const entry = loginAttempts.get(profileId) || { failures: 0, lockedUntil: null };
  entry.failures++;
  if (entry.failures >= 5) {
    entry.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
  }
  loginAttempts.set(profileId, entry);
}

function clearFailures(profileId) {
  loginAttempts.delete(profileId);
}

// GET /api/auth/profiles — public, for login screen
router.get('/profiles', (req, res, next) => {
  try {
    res.json({ profiles: getLoginProfiles() });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login — verify PIN
router.post('/login', async (req, res, next) => {
  try {
    const { profileId, pin } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }

    if (checkLoginLock(profileId)) {
      return res.status(429).json({
        error: 'Too many failed attempts. Try again in 5 minutes.',
        code: 'LOCKED'
      });
    }

    const profile = getProfileForLogin(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // If no PIN set, they need to set one first
    if (!profile.pin_hash) {
      return res.status(400).json({ error: 'PIN not set. Use /api/auth/set-pin first.', code: 'NO_PIN' });
    }

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const valid = await bcrypt.compare(pin, profile.pin_hash);
    if (!valid) {
      recordFailure(profileId);
      return res.status(401).json({ error: 'Incorrect PIN' });
    }

    clearFailures(profileId);

    const token = jwt.sign(
      { profileId: profile.id, role: profile.role, name: profile.name },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      token,
      profile: {
        id: profile.id,
        name: profile.name,
        icon: profile.icon,
        ageGroup: profile.age_group,
        role: profile.role,
        theme: profile.theme
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/set-pin — first-time PIN setup (only if no PIN exists)
router.post('/set-pin', async (req, res, next) => {
  try {
    const { profileId, pin } = req.body;
    if (!profileId || !pin) {
      return res.status(400).json({ error: 'profileId and pin are required' });
    }

    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    const profile = getProfileForLogin(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.pin_hash) {
      return res.status(400).json({ error: 'PIN already set. Use /api/auth/change-pin to change it.' });
    }

    const hash = await bcrypt.hash(pin, 10);
    setPin(profileId, hash);

    const token = jwt.sign(
      { profileId: profile.id, role: profile.role, name: profile.name },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      token,
      profile: {
        id: profile.id,
        name: profile.name,
        icon: profile.icon,
        ageGroup: profile.age_group,
        role: profile.role,
        theme: profile.theme
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me — validate token, return profile
router.get('/me', authenticate, (req, res, next) => {
  try {
    const profile = getProfileForLogin(req.user.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({
      profile: {
        id: profile.id,
        name: profile.name,
        icon: profile.icon,
        ageGroup: profile.age_group,
        role: profile.role,
        theme: profile.theme
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-pin — change existing PIN (authenticated)
router.post('/change-pin', authenticate, async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      return res.status(400).json({ error: 'currentPin and newPin are required' });
    }

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return res.status(400).json({ error: 'New PIN must be 4-6 digits' });
    }

    const profile = getProfileForLogin(req.user.profileId);
    if (!profile || !profile.pin_hash) {
      return res.status(400).json({ error: 'No existing PIN to change' });
    }

    const valid = await bcrypt.compare(currentPin, profile.pin_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    const hash = await bcrypt.hash(newPin, 10);
    setPin(req.user.profileId, hash);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/children — get linked children (admin/parent only)
router.get('/children', authenticate, requireRole('admin', 'parent'), (req, res, next) => {
  try {
    const children = getChildren(req.user.profileId);
    res.json({ children });
  } catch (error) {
    next(error);
  }
});

export default router;
