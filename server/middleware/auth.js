import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { isParentOf } from '../dal/auth.js';

let _jwtSecret = null;
const _fallback = crypto.randomBytes(32).toString('hex');

export function getJwtSecret() {
  if (_jwtSecret) return _jwtSecret;
  if (process.env.JWT_SECRET) {
    _jwtSecret = process.env.JWT_SECRET;
  } else {
    _jwtSecret = _fallback;
    console.warn('WARNING: JWT_SECRET not set in .env — using random secret (tokens will not survive server restart)');
  }
  return _jwtSecret;
}


export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, getJwtSecret());
    req.user = { profileId: payload.profileId, role: payload.role, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function canAccessProfile(reqUser, targetProfileId) {
  if (reqUser.profileId === targetProfileId) return true;
  if (reqUser.role === 'admin') return true;
  return isParentOf(reqUser.profileId, targetProfileId);
}
