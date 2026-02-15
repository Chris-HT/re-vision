import db from '../db/index.js';

export function getProfileForLogin(profileId) {
  return db.prepare(
    'SELECT id, name, icon, age_group, theme, pin_hash, role FROM profiles WHERE id = ?'
  ).get(profileId);
}

export function setPin(profileId, hashedPin) {
  db.prepare('UPDATE profiles SET pin_hash = ? WHERE id = ?').run(hashedPin, profileId);
}

export function getLoginProfiles() {
  const rows = db.prepare('SELECT id, name, icon, age_group, pin_hash, role FROM profiles').all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    ageGroup: r.age_group,
    role: r.role,
    hasPin: !!r.pin_hash
  }));
}

export function getChildren(parentId, role) {
  // Admins see all non-admin profiles; parents see linked children only
  const rows = role === 'admin'
    ? db.prepare(
        "SELECT id, name, icon, age_group, role FROM profiles WHERE role != 'admin'"
      ).all()
    : db.prepare(
        `SELECT p.id, p.name, p.icon, p.age_group, p.role
         FROM parent_child pc
         JOIN profiles p ON p.id = pc.child_id
         WHERE pc.parent_id = ?`
      ).all(parentId);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    ageGroup: r.age_group,
    role: r.role
  }));
}

export function isParentOf(parentId, childId) {
  const row = db.prepare(
    'SELECT 1 FROM parent_child WHERE parent_id = ? AND child_id = ?'
  ).get(parentId, childId);
  return !!row;
}
