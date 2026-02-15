import db from '../db/index.js';

const DAILY_CAP = 10;
const MAX_REPEATS = 3;

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ensureRow(profileId) {
  db.prepare('INSERT OR IGNORE INTO profile_tokens (profile_id, daily_reset_date) VALUES (?, ?)').run(profileId, todayDate());
}

function resetDailyIfNeeded(profileId) {
  const today = todayDate();
  const row = db.prepare('SELECT daily_reset_date FROM profile_tokens WHERE profile_id = ?').get(profileId);
  if (row && row.daily_reset_date !== today) {
    db.prepare('UPDATE profile_tokens SET daily_earned = 0, daily_reset_date = ? WHERE profile_id = ?').run(today, profileId);
  }
}

export function getProfileTokens(profileId) {
  ensureRow(profileId);
  resetDailyIfNeeded(profileId);
  const row = db.prepare('SELECT tokens, token_rate, daily_earned FROM profile_tokens WHERE profile_id = ?').get(profileId);
  return {
    tokens: row.tokens,
    tokenRate: row.token_rate,
    dailyEarned: row.daily_earned,
    dailyRemaining: Math.max(0, DAILY_CAP - row.daily_earned)
  };
}

export function calculateTokenReward(profileId, score, difficulty, testKey) {
  ensureRow(profileId);
  resetDailyIfNeeded(profileId);

  // Score gate: < 50% earns nothing
  if (score < 50) {
    return { amount: 0, reason: 'Score below 50% — keep practising!' };
  }

  // Base tokens by difficulty
  const baseMap = { easy: 2, medium: 3, hard: 5 };
  const base = baseMap[difficulty] || 3;

  // Score multiplier: ceil(base * (score - 50) / 50)
  const calculated = Math.ceil(base * (score - 50) / 50);

  // Check test history for repeats and mastery
  const history = db.prepare(
    'SELECT times_completed, best_score FROM token_test_history WHERE profile_id = ? AND test_key = ?'
  ).get(profileId, testKey);

  if (history) {
    // Mastery gate: if previously scored 100%, no more tokens
    if (history.best_score >= 100) {
      return { amount: 0, reason: 'Test mastered — try a different topic!' };
    }

    // Repeat penalty: 1st=100%, 2nd=50%, 3rd=25%, 4th+=0
    if (history.times_completed >= MAX_REPEATS) {
      return { amount: 0, reason: 'Maximum repeats reached — try a new test!' };
    }

    const repeatMultipliers = [1, 0.5, 0.25];
    const multiplier = repeatMultipliers[history.times_completed] || 0;
    const afterRepeat = Math.max(1, Math.ceil(calculated * multiplier));

    // Daily cap
    const row = db.prepare('SELECT daily_earned FROM profile_tokens WHERE profile_id = ?').get(profileId);
    const remaining = Math.max(0, DAILY_CAP - row.daily_earned);
    if (remaining <= 0) {
      return { amount: 0, reason: 'Daily token cap reached — come back tomorrow!' };
    }

    const final = Math.min(afterRepeat, remaining);
    const repeatNum = history.times_completed + 1;
    return { amount: final, reason: `${difficulty} test, ${score}% score (attempt ${repeatNum}/${MAX_REPEATS})` };
  }

  // First attempt — no repeat penalty
  const row = db.prepare('SELECT daily_earned FROM profile_tokens WHERE profile_id = ?').get(profileId);
  const remaining = Math.max(0, DAILY_CAP - row.daily_earned);
  if (remaining <= 0) {
    return { amount: 0, reason: 'Daily token cap reached — come back tomorrow!' };
  }

  const final = Math.min(calculated, remaining);
  return { amount: final, reason: `${difficulty} test, ${score}% score` };
}

export function awardTokens(profileId, amount, reason, sessionId) {
  ensureRow(profileId);
  db.prepare('UPDATE profile_tokens SET tokens = tokens + ?, daily_earned = daily_earned + ? WHERE profile_id = ?')
    .run(amount, amount, profileId);
  db.prepare(
    'INSERT INTO token_transactions (profile_id, amount, reason, session_id, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(profileId, amount, reason, sessionId || null, new Date().toISOString());
  const row = db.prepare('SELECT tokens FROM profile_tokens WHERE profile_id = ?').get(profileId);
  return row.tokens;
}

export function recordTestCompletion(profileId, testKey, score) {
  db.prepare(
    `INSERT INTO token_test_history (profile_id, test_key, times_completed, best_score)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(profile_id, test_key) DO UPDATE SET
       times_completed = times_completed + 1,
       best_score = MAX(best_score, ?)`
  ).run(profileId, testKey, score, score);
}

export function getTokenTransactions(profileId, limit = 20) {
  return db.prepare(
    'SELECT id, amount, reason, session_id as sessionId, created_at as createdAt FROM token_transactions WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(profileId, limit);
}

export function getChildTokenSummaries(childIds) {
  if (!childIds || childIds.length === 0) return [];
  const results = [];
  for (const id of childIds) {
    ensureRow(id);
    resetDailyIfNeeded(id);
    const row = db.prepare('SELECT tokens, token_rate, daily_earned FROM profile_tokens WHERE profile_id = ?').get(id);
    results.push({
      profileId: id,
      tokens: row.tokens,
      tokenRate: row.token_rate,
      dailyEarned: row.daily_earned,
      dailyRemaining: Math.max(0, DAILY_CAP - row.daily_earned),
      monetaryValue: parseFloat((row.tokens * row.token_rate).toFixed(2))
    });
  }
  return results;
}

export function setTokenRate(profileId, rate) {
  ensureRow(profileId);
  db.prepare('UPDATE profile_tokens SET token_rate = ? WHERE profile_id = ?').run(rate, profileId);
}
