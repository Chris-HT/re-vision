import db from '../db/index.js';

// Level curve: XP required to go from `level` to `level+1`
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Calculate level from total XP
function levelFromXP(totalXp) {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return level;
}

// XP needed for the *current* level's next threshold
function xpToNextLevel(totalXp, level) {
  let consumed = 0;
  for (let l = 1; l < level; l++) consumed += xpForLevel(l);
  return { current: totalXp - consumed, required: xpForLevel(level) };
}

export function getProfileXP(profileId) {
  db.prepare('INSERT OR IGNORE INTO profile_xp (profile_id) VALUES (?)').run(profileId);
  const row = db.prepare('SELECT total_xp, level FROM profile_xp WHERE profile_id = ?').get(profileId);
  const progress = xpToNextLevel(row.total_xp, row.level);
  return { totalXp: row.total_xp, level: row.level, xpProgress: progress.current, xpRequired: progress.required };
}

export function awardXP(profileId, amount) {
  db.prepare('INSERT OR IGNORE INTO profile_xp (profile_id) VALUES (?)').run(profileId);
  db.prepare('UPDATE profile_xp SET total_xp = total_xp + ? WHERE profile_id = ?').run(amount, profileId);
  const row = db.prepare('SELECT total_xp FROM profile_xp WHERE profile_id = ?').get(profileId);
  const newLevel = levelFromXP(row.total_xp);
  const oldLevel = db.prepare('SELECT level FROM profile_xp WHERE profile_id = ?').get(profileId).level;
  db.prepare('UPDATE profile_xp SET level = ? WHERE profile_id = ?').run(newLevel, profileId);
  const progress = xpToNextLevel(row.total_xp, newLevel);
  return {
    totalXp: row.total_xp,
    level: newLevel,
    leveledUp: newLevel > oldLevel,
    newLevel,
    xpProgress: progress.current,
    xpRequired: progress.required
  };
}

export function getSubjectXP(profileId) {
  return db.prepare('SELECT subject_id as subjectId, xp FROM subject_xp WHERE profile_id = ?').all(profileId);
}

export function awardSubjectXP(profileId, subjectId, amount) {
  db.prepare(
    `INSERT INTO subject_xp (profile_id, subject_id, xp) VALUES (?, ?, ?)
     ON CONFLICT(profile_id, subject_id) DO UPDATE SET xp = xp + ?`
  ).run(profileId, subjectId, amount, amount);
}

export function getProfileCoins(profileId) {
  db.prepare('INSERT OR IGNORE INTO profile_coins (profile_id) VALUES (?)').run(profileId);
  const row = db.prepare('SELECT coins FROM profile_coins WHERE profile_id = ?').get(profileId);
  return { coins: row.coins };
}

export function awardCoins(profileId, amount, reason) {
  db.prepare('INSERT OR IGNORE INTO profile_coins (profile_id) VALUES (?)').run(profileId);
  db.prepare('UPDATE profile_coins SET coins = coins + ? WHERE profile_id = ?').run(amount, profileId);
  db.prepare(
    'INSERT INTO coin_transactions (profile_id, amount, reason, created_at) VALUES (?, ?, ?, ?)'
  ).run(profileId, amount, reason, new Date().toISOString());
  return getProfileCoins(profileId);
}

export function getAllAchievements() {
  return db.prepare('SELECT * FROM achievements ORDER BY category, threshold').all();
}

export function getProfileAchievements(profileId) {
  return db.prepare(
    `SELECT a.*, pa.unlocked_at as unlockedAt
     FROM achievements a
     LEFT JOIN profile_achievements pa ON a.id = pa.achievement_id AND pa.profile_id = ?
     ORDER BY a.category, a.threshold`
  ).all(profileId);
}

export function unlockAchievement(profileId, achievementId) {
  const result = db.prepare(
    'INSERT OR IGNORE INTO profile_achievements (profile_id, achievement_id, unlocked_at) VALUES (?, ?, ?)'
  ).run(profileId, achievementId, new Date().toISOString());
  return result.changes > 0; // true if newly unlocked
}

export function checkAndUnlockAchievements(profileId) {
  const newlyUnlocked = [];

  // Get current stats
  const cardReviews = db.prepare(
    'SELECT COUNT(*) as cnt FROM card_history WHERE profile_id = ?'
  ).get(profileId).cnt;

  const testCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM test_sessions WHERE profile_id = ?'
  ).get(profileId).cnt;

  const perfectTests = db.prepare(
    'SELECT COUNT(*) as cnt FROM test_sessions WHERE profile_id = ? AND score = 100'
  ).get(profileId).cnt;

  const statsRow = db.prepare(
    'SELECT current_streak, longest_streak FROM profile_stats WHERE profile_id = ?'
  ).get(profileId);
  const streak = statsRow ? Math.max(statsRow.current_streak, statsRow.longest_streak) : 0;

  const xpRow = db.prepare('SELECT level FROM profile_xp WHERE profile_id = ?').get(profileId);
  const level = xpRow ? xpRow.level : 1;

  // Check card achievements
  if (cardReviews >= 1 && unlockAchievement(profileId, 'first-card')) {
    newlyUnlocked.push('first-card');
  }
  if (cardReviews >= 10 && unlockAchievement(profileId, 'ten-cards')) {
    newlyUnlocked.push('ten-cards');
  }
  if (cardReviews >= 100 && unlockAchievement(profileId, 'hundred-cards')) {
    newlyUnlocked.push('hundred-cards');
  }

  // Check test achievements
  if (testCount >= 1 && unlockAchievement(profileId, 'first-test')) {
    newlyUnlocked.push('first-test');
  }
  if (testCount >= 5 && unlockAchievement(profileId, 'five-tests')) {
    newlyUnlocked.push('five-tests');
  }
  if (perfectTests >= 1 && unlockAchievement(profileId, 'perfect-score')) {
    newlyUnlocked.push('perfect-score');
  }

  // Check streak achievements
  if (streak >= 3 && unlockAchievement(profileId, 'three-streak')) {
    newlyUnlocked.push('three-streak');
  }
  if (streak >= 7 && unlockAchievement(profileId, 'seven-streak')) {
    newlyUnlocked.push('seven-streak');
  }

  // Check level achievements
  if (level >= 5 && unlockAchievement(profileId, 'level-five')) {
    newlyUnlocked.push('level-five');
  }
  if (level >= 10 && unlockAchievement(profileId, 'level-ten')) {
    newlyUnlocked.push('level-ten');
  }

  // Return full achievement objects for newly unlocked
  if (newlyUnlocked.length === 0) return [];
  const placeholders = newlyUnlocked.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM achievements WHERE id IN (${placeholders})`).all(...newlyUnlocked);
}

export function getGamificationSummary(profileId) {
  const xp = getProfileXP(profileId);
  const coins = getProfileCoins(profileId);
  const unlockedCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM profile_achievements WHERE profile_id = ?'
  ).get(profileId).cnt;
  const totalAchievements = db.prepare('SELECT COUNT(*) as cnt FROM achievements').get().cnt;

  return {
    ...xp,
    ...coins,
    achievementsUnlocked: unlockedCount,
    achievementsTotal: totalAchievements
  };
}
