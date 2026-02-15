import db from '../db/index.js';

/**
 * Get all profiles.
 * Returns { profiles: [...] } matching the old profiles.json shape.
 */
export function getAllProfiles() {
  const rows = db.prepare('SELECT * FROM profiles').all();
  return {
    profiles: rows.map(toProfile)
  };
}

/**
 * Get a single profile by ID.
 */
export function getProfile(profileId) {
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);
  return row ? toProfile(row) : null;
}

/**
 * Update allowed fields on a profile.
 * Returns the updated profile, or null if not found.
 */
export function updateProfile(profileId, updates) {
  const existing = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);
  if (!existing) return null;

  const allowedFields = {
    theme: 'theme',
    favourites: 'favourites',
    name: 'name',
    icon: 'icon',
    fontSize: 'font_size',
    reduceAnimations: 'reduce_animations',
    literalLanguage: 'literal_language'
  };

  const sets = [];
  const values = [];

  for (const [field, column] of Object.entries(allowedFields)) {
    if (updates[field] !== undefined) {
      sets.push(`${column} = ?`);
      // JSON-encode arrays
      values.push(Array.isArray(updates[field]) ? JSON.stringify(updates[field]) : updates[field]);
    }
  }

  if (sets.length === 0) {
    return toProfile(existing);
  }

  values.push(profileId);
  db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  return getProfile(profileId);
}

function toProfile(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    defaultSubjects: row.default_subjects ? JSON.parse(row.default_subjects) : [],
    ageGroup: row.age_group,
    theme: row.theme,
    role: row.role || 'child',
    favourites: row.favourites ? JSON.parse(row.favourites) : [],
    fontSize: row.font_size || 'medium',
    reduceAnimations: !!row.reduce_animations,
    literalLanguage: !!row.literal_language
  };
}
