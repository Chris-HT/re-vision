import db from '../db/index.js';
import { randomUUID } from 'crypto';

export function getProfileForLogin(profileId) {
  return db.prepare(
    'SELECT id, name, icon, age_group, theme, pin_hash, role FROM profiles WHERE id = ?'
  ).get(profileId);
}

export function setPin(profileId, hashedPin) {
  db.prepare('UPDATE profiles SET pin_hash = ? WHERE id = ?').run(hashedPin, profileId);
}

export function getLoginProfiles() {
  const rows = db.prepare('SELECT id, name, icon, age_group, pin_hash FROM profiles').all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    ageGroup: r.age_group,
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

export function getAllProfiles() {
  const rows = db.prepare(
    `SELECT p.id, p.name, p.icon, p.age_group, p.role, p.pin_hash, p.default_subjects,
            pc.parent_id
     FROM profiles p
     LEFT JOIN parent_child pc ON pc.child_id = p.id
     ORDER BY p.id`
  ).all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    ageGroup: r.age_group,
    role: r.role,
    hasPin: !!r.pin_hash,
    parentId: r.parent_id || null,
    defaultSubjects: (() => {
      try { return JSON.parse(r.default_subjects || '[]'); } catch { return []; }
    })()
  }));
}

export function createProfile({ name, icon, role, age_group, default_subjects, parent_id }) {
  const id = randomUUID();
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO profiles (id, name, icon, age_group, role, default_subjects, theme, font_size)
       VALUES (?, ?, ?, ?, ?, ?, 'dark', 'medium')`
    ).run(id, name, icon, age_group, role, JSON.stringify(default_subjects || []));

    if (parent_id && role === 'child') {
      db.prepare('INSERT OR IGNORE INTO parent_child (parent_id, child_id) VALUES (?, ?)').run(parent_id, id);
    }
  });
  run();
  return id;
}

export function updateProfile(id, { name, icon, role, age_group, default_subjects, parent_id }) {
  const update = db.transaction(() => {
    db.prepare(
      `UPDATE profiles SET name = ?, icon = ?, age_group = ?, role = ?, default_subjects = ? WHERE id = ?`
    ).run(name, icon, age_group, role, JSON.stringify(default_subjects || []), id);

    db.prepare('DELETE FROM parent_child WHERE child_id = ?').run(id);
    if (parent_id && role === 'child') {
      db.prepare('INSERT INTO parent_child (parent_id, child_id) VALUES (?, ?)').run(parent_id, id);
    }
  });
  update();
}

export function deleteProfile(id) {
  const cascade = db.transaction((profileId) => {
    const tables = [
      'card_progress', 'card_history', 'profile_stats',
      'profile_xp', 'subject_xp', 'profile_coins', 'coin_transactions',
      'profile_achievements', 'profile_quests', 'profile_reward_state',
      'profile_tokens', 'token_transactions', 'token_test_history',
      'weekly_streaks', 'test_sessions', 'test_reports', 'learning_profiles'
    ];
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table} WHERE profile_id = ?`).run(profileId);
    }
    // parent_child: remove as either parent or child
    db.prepare('DELETE FROM parent_child WHERE parent_id = ? OR child_id = ?').run(profileId, profileId);
    db.prepare('DELETE FROM profiles WHERE id = ?').run(profileId);
  });
  cascade(id);
}
