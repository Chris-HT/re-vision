import db from '../db/index.js';

/**
 * Get ISO date string for today (local time).
 */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get ISO week string (e.g. "2026-W07").
 */
function getISOWeek() {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Assign 3 random daily quests if none assigned today.
 */
export function assignDailyQuests(profileId) {
  const todayStr = today();
  const existing = db.prepare(
    `SELECT COUNT(*) as cnt FROM profile_quests pq
     JOIN quest_definitions qd ON pq.quest_id = qd.id
     WHERE pq.profile_id = ? AND pq.assigned_date = ? AND qd.type = 'daily'`
  ).get(profileId, todayStr);

  if (existing.cnt >= 3) return;

  const allDaily = db.prepare("SELECT id FROM quest_definitions WHERE type = 'daily'").all();
  // Shuffle and pick 3
  const shuffled = allDaily.sort(() => Math.random() - 0.5).slice(0, 3);

  const insert = db.prepare(
    'INSERT OR IGNORE INTO profile_quests (profile_id, quest_id, progress, completed, assigned_date) VALUES (?, ?, 0, 0, ?)'
  );
  for (const q of shuffled) {
    insert.run(profileId, q.id, todayStr);
  }
}

/**
 * Assign 1 random weekly quest if none assigned this ISO week.
 */
export function assignWeeklyQuest(profileId) {
  const weekStr = getISOWeek();
  const existing = db.prepare(
    `SELECT COUNT(*) as cnt FROM profile_quests pq
     JOIN quest_definitions qd ON pq.quest_id = qd.id
     WHERE pq.profile_id = ? AND pq.assigned_date = ? AND qd.type = 'weekly'`
  ).get(profileId, weekStr);

  if (existing.cnt >= 1) return;

  const allWeekly = db.prepare("SELECT id FROM quest_definitions WHERE type = 'weekly'").all();
  const pick = allWeekly[Math.floor(Math.random() * allWeekly.length)];
  if (!pick) return;

  db.prepare(
    'INSERT OR IGNORE INTO profile_quests (profile_id, quest_id, progress, completed, assigned_date) VALUES (?, ?, 0, 0, ?)'
  ).run(profileId, pick.id, weekStr);
}

/**
 * Get active quests (today's daily + this week's weekly) with progress.
 */
export function getActiveQuests(profileId) {
  const todayStr = today();
  const weekStr = getISOWeek();

  const quests = db.prepare(
    `SELECT pq.id, pq.quest_id, pq.progress, pq.completed, pq.assigned_date, pq.completed_at,
            qd.type, qd.title, qd.description, qd.target, qd.metric, qd.xp_reward, qd.coin_reward
     FROM profile_quests pq
     JOIN quest_definitions qd ON pq.quest_id = qd.id
     WHERE pq.profile_id = ?
       AND ((qd.type = 'daily' AND pq.assigned_date = ?) OR (qd.type = 'weekly' AND pq.assigned_date = ?))
     ORDER BY qd.type ASC, pq.id ASC`
  ).all(profileId, todayStr, weekStr);

  return quests.map(q => ({
    id: q.id,
    questId: q.quest_id,
    type: q.type,
    title: q.title,
    description: q.description,
    target: q.target,
    metric: q.metric,
    progress: q.progress,
    completed: !!q.completed,
    completedAt: q.completed_at,
    xpReward: q.xp_reward,
    coinReward: q.coin_reward
  }));
}

/**
 * Increment progress on matching active quests.
 * Returns array of newly completed quests with rewards.
 */
export function incrementQuestProgress(profileId, metric, amount = 1) {
  const todayStr = today();
  const weekStr = getISOWeek();

  // Find active, incomplete quests matching this metric
  const matching = db.prepare(
    `SELECT pq.id, pq.progress, qd.target, qd.xp_reward, qd.coin_reward, qd.title, qd.type
     FROM profile_quests pq
     JOIN quest_definitions qd ON pq.quest_id = qd.id
     WHERE pq.profile_id = ? AND pq.completed = 0 AND qd.metric = ?
       AND ((qd.type = 'daily' AND pq.assigned_date = ?) OR (qd.type = 'weekly' AND pq.assigned_date = ?))
    `
  ).all(profileId, metric, todayStr, weekStr);

  const completed = [];

  for (const quest of matching) {
    const newProgress = Math.min(quest.progress + amount, quest.target);
    const justCompleted = newProgress >= quest.target;

    if (justCompleted) {
      db.prepare(
        'UPDATE profile_quests SET progress = ?, completed = 1, completed_at = ? WHERE id = ?'
      ).run(newProgress, new Date().toISOString(), quest.id);
      completed.push({
        questId: quest.id,
        title: quest.title,
        type: quest.type,
        xpReward: quest.xp_reward,
        coinReward: quest.coin_reward
      });
    } else {
      db.prepare('UPDATE profile_quests SET progress = ? WHERE id = ?').run(newProgress, quest.id);
    }
  }

  return completed;
}

/**
 * Get reward state for a profile.
 */
export function getRewardState(profileId) {
  db.prepare(
    'INSERT OR IGNORE INTO profile_reward_state (profile_id) VALUES (?)'
  ).run(profileId);

  const row = db.prepare('SELECT * FROM profile_reward_state WHERE profile_id = ?').get(profileId);
  return {
    lastSessionDate: row.last_session_date,
    dailyBonusUsed: row.daily_bonus_used,
    variableRewards: !!row.variable_rewards
  };
}

/**
 * Update last session date to today.
 */
export function updateLastSessionDate(profileId) {
  db.prepare(
    'INSERT OR IGNORE INTO profile_reward_state (profile_id) VALUES (?)'
  ).run(profileId);
  db.prepare(
    'UPDATE profile_reward_state SET last_session_date = ? WHERE profile_id = ?'
  ).run(today(), profileId);
}

/**
 * Check if comeback bonus is eligible (3+ days since last session).
 */
export function checkComebackBonus(profileId) {
  const state = getRewardState(profileId);
  if (!state.lastSessionDate) {
    return { eligible: false, daysSinceLastSession: null };
  }
  const last = new Date(state.lastSessionDate);
  const now = new Date();
  const diffDays = Math.floor((now - last) / 86400000);
  return { eligible: diffDays >= 3, daysSinceLastSession: diffDays };
}

/**
 * Check if daily bonus is available (not yet used today).
 */
export function checkDailyBonus(profileId) {
  const state = getRewardState(profileId);
  return { available: state.dailyBonusUsed !== today() };
}

/**
 * Mark daily bonus as used today.
 */
export function markDailyBonusUsed(profileId) {
  db.prepare(
    'INSERT OR IGNORE INTO profile_reward_state (profile_id) VALUES (?)'
  ).run(profileId);
  db.prepare(
    'UPDATE profile_reward_state SET daily_bonus_used = ? WHERE profile_id = ?'
  ).run(today(), profileId);
}
