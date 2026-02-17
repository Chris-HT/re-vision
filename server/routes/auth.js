import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getProfileForLogin, setPin, getLoginProfiles, getChildren, getAllProfiles, createProfile, updateProfile, deleteProfile } from '../dal/auth.js';
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

function toAuthProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    icon: profile.icon,
    ageGroup: profile.age_group,
    role: profile.role,
    theme: profile.theme,
    fontSize: profile.font_size || 'medium',
    reduceAnimations: !!profile.reduce_animations,
    literalLanguage: !!profile.literal_language
  };
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
      const entry = loginAttempts.get(profileId);
      const attemptsRemaining = Math.max(0, 5 - (entry?.failures || 0));
      return res.status(401).json({
        error: 'Incorrect PIN',
        attemptsRemaining,
        code: attemptsRemaining === 0 ? 'RATE_LIMIT' : undefined
      });
    }

    clearFailures(profileId);

    const token = jwt.sign(
      { profileId: profile.id, role: profile.role, name: profile.name },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      token,
      profile: toAuthProfile(profile)
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
      profile: toAuthProfile(profile)
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
      profile: toAuthProfile(profile)
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
    const children = getChildren(req.user.profileId, req.user.role);
    res.json({ children });
  } catch (error) {
    next(error);
  }
});


// GET /api/auth/profiles/all — admin: list all profiles
router.get('/profiles/all', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    res.json({ profiles: getAllProfiles() });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/profiles — admin: create new profile
router.post('/profiles', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const { name, icon, role, age_group, default_subjects, parent_id } = req.body;
    if (!name || !icon || !role || !age_group) {
      return res.status(400).json({ error: 'name, icon, role, and age_group are required' });
    }
    if (name.length < 2 || name.length > 30) {
      return res.status(400).json({ error: 'Name must be 2–30 characters' });
    }
    if (!['admin', 'parent', 'child'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!['adult', 'secondary', 'primary'].includes(age_group)) {
      return res.status(400).json({ error: 'Invalid age_group' });
    }
    if (role === 'child' && !parent_id) {
      return res.status(400).json({ error: 'parent_id is required for child accounts' });
    }
    if (role === 'child' && parent_id) {
      const parentProfile = getProfileForLogin(parent_id);
      if (!parentProfile) {
        return res.status(400).json({ error: 'Parent profile not found' });
      }
    }
    const id = createProfile({ name, icon, role, age_group, default_subjects, parent_id });
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profiles/:id — admin: update profile
router.put('/profiles/:id', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, icon, role, age_group, default_subjects, parent_id } = req.body;
    if (!name || !icon || !role || !age_group) {
      return res.status(400).json({ error: 'name, icon, role, and age_group are required' });
    }
    if (name.length < 2 || name.length > 30) {
      return res.status(400).json({ error: 'Name must be 2–30 characters' });
    }
    if (!['admin', 'parent', 'child'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!['adult', 'secondary', 'primary'].includes(age_group)) {
      return res.status(400).json({ error: 'Invalid age_group' });
    }
    if (role === 'child' && !parent_id) {
      return res.status(400).json({ error: 'parent_id is required for child accounts' });
    }
    if (role === 'child' && parent_id) {
      const parentProfile = getProfileForLogin(parent_id);
      if (!parentProfile) {
        return res.status(400).json({ error: 'Parent profile not found' });
      }
    }
    const existing = getProfileForLogin(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });
    if (existing.role === 'admin' && role !== 'admin') {
      const adminCount = getAllProfiles().filter(p => p.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot change role: this is the only admin account' });
      }
    }
    updateProfile(id, { name, icon, role, age_group, default_subjects, parent_id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auth/profiles/:id — admin: delete profile + all data
router.delete('/profiles/:id', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const id = req.params.id;
    if (id === String(req.user.profileId)) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }
    const existing = getProfileForLogin(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });
    deleteProfile(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

