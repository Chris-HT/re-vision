import db from '../db/index.js';
import { createCard, updateCard } from '../utils/spacedRepetition.js';
import { createStats, updateStats } from '../utils/streaks.js';

/**
 * Get full progress data for a profile.
 * Returns the same shape as the old progress JSON: { profileId, cards, stats }
 */
export function getProgress(profileId) {
  ensureProfileStats(profileId);

  const cardRows = db.prepare(
    'SELECT * FROM card_progress WHERE profile_id = ?'
  ).all(profileId);

  // Batch-fetch all history for this profile in one query, then group by card_id
  const allHistory = db.prepare(
    `SELECT card_id, date, result FROM (
       SELECT card_id, date, result, ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY id DESC) as rn
       FROM card_history WHERE profile_id = ?
     ) WHERE rn <= 20`
  ).all(profileId);

  const historyByCard = new Map();
  for (const h of allHistory) {
    if (!historyByCard.has(h.card_id)) historyByCard.set(h.card_id, []);
    historyByCard.get(h.card_id).push({ date: h.date, result: h.result });
  }

  const cards = {};
  for (const c of cardRows) {
    cards[c.card_id] = {
      lastSeen: c.last_seen,
      nextDue: c.next_due,
      interval: c.interval,
      easeFactor: c.ease_factor,
      repetitions: c.repetitions,
      history: historyByCard.get(c.card_id) || []
    };
  }

  const stats = getStats(profileId);

  return { profileId, cards, stats };
}

/**
 * Record a card review (replaces PUT /progress/:profileId/card/:cardId).
 * Wrapped in a transaction to prevent data corruption from concurrent requests.
 */
export const recordCardReview = db.transaction((profileId, cardId, result) => {
  ensureProfileStats(profileId);

  // Get or create card
  let cardRow = db.prepare(
    'SELECT * FROM card_progress WHERE profile_id = ? AND card_id = ?'
  ).get(profileId, cardId);

  let card;
  if (cardRow) {
    // Reconstruct card object for the SM-2 utility
    const history = db.prepare(
      'SELECT date, result FROM card_history WHERE profile_id = ? AND card_id = ? ORDER BY id DESC LIMIT 20'
    ).all(profileId, cardId);
    card = {
      lastSeen: cardRow.last_seen,
      nextDue: cardRow.next_due,
      interval: cardRow.interval,
      easeFactor: cardRow.ease_factor,
      repetitions: cardRow.repetitions,
      history
    };
  } else {
    card = createCard();
  }

  // Apply SM-2 update
  card = updateCard(card, result);

  // Upsert card_progress
  db.prepare(
    `INSERT INTO card_progress (profile_id, card_id, last_seen, next_due, interval, ease_factor, repetitions)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(profile_id, card_id) DO UPDATE SET
       last_seen = excluded.last_seen,
       next_due = excluded.next_due,
       interval = excluded.interval,
       ease_factor = excluded.ease_factor,
       repetitions = excluded.repetitions`
  ).run(profileId, cardId, card.lastSeen, card.nextDue, card.interval, card.easeFactor, card.repetitions);

  // Insert history entry (the most recent one from updateCard)
  const latestEntry = card.history[0];
  db.prepare(
    'INSERT INTO card_history (profile_id, card_id, date, result) VALUES (?, ?, ?, ?)'
  ).run(profileId, cardId, latestEntry.date, latestEntry.result);

  // Update stats
  const today = new Date().toISOString().split('T')[0];
  const statsRow = db.prepare('SELECT * FROM profile_stats WHERE profile_id = ?').get(profileId);
  const lastDate = statsRow?.last_session_date
    ? statsRow.last_session_date.split('T')[0]
    : null;
  const isNewSession = lastDate !== today;

  let stats = statsRow ? {
    totalSessions: statsRow.total_sessions,
    totalCardsStudied: statsRow.total_cards_studied,
    currentStreak: statsRow.current_streak,
    longestStreak: statsRow.longest_streak,
    lastSessionDate: statsRow.last_session_date
  } : createStats();

  stats = updateStats(stats, isNewSession);

  db.prepare(
    `UPDATE profile_stats SET
       total_sessions = ?, total_cards_studied = ?,
       current_streak = ?, longest_streak = ?,
       last_session_date = ?
     WHERE profile_id = ?`
  ).run(stats.totalSessions, stats.totalCardsStudied,
    stats.currentStreak, stats.longestStreak,
    stats.lastSessionDate, profileId);

  // Update weekly streak tracking
  updateWeeklyStreak(profileId);

  return { card, stats };
});

/**
 * Get cards due for review.
 */
export function getDueCards(profileId, themeList, maxCards) {
  const now = new Date().toISOString();

  // Use SQL-level filtering instead of loading all questions into memory
  let themeFilter = '';
  let themeParams = [];
  if (themeList) {
    const placeholders = themeList.map(() => '?').join(',');
    themeFilter = `AND q.theme_id IN (${placeholders})`;
    themeParams = themeList;
  }

  // Get due cards via JOIN — only cards that exist in questions and are overdue
  const dueCards = db.prepare(
    `SELECT cp.card_id as id, cp.next_due as nextDue
     FROM card_progress cp
     JOIN questions q ON cp.card_id = q.id
     WHERE cp.profile_id = ? AND cp.last_seen IS NOT NULL AND cp.next_due <= ? ${themeFilter}
     ORDER BY cp.next_due ASC`
  ).all(profileId, now, ...themeParams);

  // Get seen card IDs (all cards with progress, not just due)
  const seenCardIds = new Set(
    db.prepare(
      `SELECT cp.card_id FROM card_progress cp
       JOIN questions q ON cp.card_id = q.id
       WHERE cp.profile_id = ? ${themeFilter}`
    ).all(profileId, ...themeParams).map(r => r.card_id)
  );

  // Get unseen cards — questions with no progress entry
  const unseenCards = db.prepare(
    `SELECT q.id FROM questions q
     WHERE q.id NOT IN (SELECT card_id FROM card_progress WHERE profile_id = ?)
     ${themeFilter ? themeFilter.replace('q.theme_id', 'q.theme_id') : ''}`
  ).all(profileId, ...themeParams).map(r => r.id);

  const dueIds = dueCards.map(c => c.id).slice(0, maxCards);
  const unseenIds = unseenCards.slice(0, Math.max(0, maxCards - dueIds.length));

  return {
    dueCards: dueIds,
    unseenCards: unseenIds,
    totalDue: dueCards.length,
    totalUnseen: unseenCards.length
  };
}

/**
 * Get detailed stats for the dashboard.
 */
export function getDetailedStats(profileId) {
  ensureProfileStats(profileId);

  const stats = getStats(profileId);

  // Overall accuracy
  const accuracyRow = db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct
     FROM card_history
     WHERE profile_id = ? AND result != 'skipped'`
  ).get(profileId);

  const overallAccuracy = accuracyRow.total > 0
    ? Math.round((accuracyRow.correct / accuracyRow.total) * 100)
    : 0;

  // Due today
  const now = new Date().toISOString();
  const dueToday = db.prepare(
    `SELECT COUNT(*) as cnt FROM card_progress
     WHERE profile_id = ? AND next_due <= ? AND last_seen IS NOT NULL`
  ).get(profileId, now).cnt;

  // Daily accuracy (last 30 days)
  const accuracyOverTime = db.prepare(
    `SELECT
       substr(date, 1, 10) as date,
       ROUND(SUM(CASE WHEN result = 'correct' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100) as accuracy,
       COUNT(*) as total
     FROM card_history
     WHERE profile_id = ? AND result != 'skipped'
     GROUP BY substr(date, 1, 10)
     ORDER BY date DESC
     LIMIT 30`
  ).all(profileId).reverse().map(r => ({
    date: r.date,
    accuracy: r.accuracy,
    total: r.total
  }));

  // Category breakdown (join with questions table)
  const categoryBreakdown = db.prepare(
    `SELECT
       q.category,
       SUM(CASE WHEN h.result = 'correct' THEN 1 ELSE 0 END) as correct,
       COUNT(*) as total,
       ROUND(SUM(CASE WHEN h.result = 'correct' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100) as accuracy,
       COUNT(DISTINCT h.card_id) as cardCount
     FROM card_history h
     JOIN questions q ON h.card_id = q.id
     WHERE h.profile_id = ? AND h.result != 'skipped'
     GROUP BY q.category
     ORDER BY accuracy ASC`
  ).all(profileId).map(r => ({
    category: r.category,
    correct: r.correct,
    total: r.total,
    accuracy: r.accuracy,
    cardCount: r.cardCount
  }));

  // Weakest cards
  const weakestCards = db.prepare(
    `SELECT
       cp.card_id as cardId,
       q.question,
       q.category,
       cp.ease_factor as easeFactor,
       SUM(CASE WHEN h.result = 'incorrect' THEN 1 ELSE 0 END) as incorrectCount,
       cp.last_seen as lastSeen
     FROM card_progress cp
     JOIN questions q ON cp.card_id = q.id
     LEFT JOIN card_history h ON cp.profile_id = h.profile_id AND cp.card_id = h.card_id
     WHERE cp.profile_id = ?
     GROUP BY cp.card_id
     HAVING incorrectCount > 0 OR cp.ease_factor < 2.0
     ORDER BY cp.ease_factor ASC
     LIMIT 10`
  ).all(profileId).map(r => ({
    cardId: r.cardId,
    question: r.question || r.cardId,
    category: r.category || 'Unknown',
    easeFactor: r.easeFactor,
    incorrectCount: r.incorrectCount,
    lastSeen: r.lastSeen
  }));

  // Heatmap: last 84 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 84);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const heatmapRows = db.prepare(
    `SELECT substr(date, 1, 10) as day, COUNT(*) as cnt
     FROM card_history
     WHERE profile_id = ? AND substr(date, 1, 10) >= ?
     GROUP BY day`
  ).all(profileId, cutoffStr);

  const heatmapData = {};
  for (const r of heatmapRows) {
    heatmapData[r.day] = r.cnt;
  }

  return {
    ...stats,
    overallAccuracy,
    dueToday,
    accuracyOverTime,
    categoryBreakdown,
    weakestCards,
    heatmapData
  };
}

function getStats(profileId) {
  const row = db.prepare('SELECT * FROM profile_stats WHERE profile_id = ?').get(profileId);
  if (!row) return createStats();
  return {
    totalSessions: row.total_sessions,
    totalCardsStudied: row.total_cards_studied,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastSessionDate: row.last_session_date
  };
}

/**
 * Get ISO week string (e.g. "2026-W07") and day of week (1=Mon..7=Sun).
 */
function getISOWeekInfo(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return {
    weekStr: `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
    dayOfWeek: dayNum
  };
}

/**
 * Parse a week string like "2026-W07" into a comparable number (year * 100 + week).
 */
function weekToNum(weekStr) {
  if (!weekStr) return 0;
  const [y, w] = weekStr.split('-W').map(Number);
  return y * 100 + w;
}

/**
 * Update weekly streak for a profile. Called during card review.
 */
export function updateWeeklyStreak(profileId) {
  const { weekStr, dayOfWeek } = getISOWeekInfo();

  db.prepare(
    `INSERT OR IGNORE INTO weekly_streaks (profile_id, week_study_days, last_week_completed)
     VALUES (?, '{}', NULL)`
  ).run(profileId);

  const row = db.prepare('SELECT * FROM weekly_streaks WHERE profile_id = ?').get(profileId);
  let studyDays = {};
  try { studyDays = JSON.parse(row.week_study_days || '{}'); } catch { studyDays = {}; }

  if (!studyDays[weekStr]) studyDays[weekStr] = [];
  if (!studyDays[weekStr].includes(dayOfWeek)) {
    studyDays[weekStr].push(dayOfWeek);
  }

  let { current_weekly_streak: streak, longest_weekly_streak: longest, last_week_completed: lastCompleted } = row;

  // Check if this week qualifies (4+ days)
  if (studyDays[weekStr].length >= 4 && lastCompleted !== weekStr) {
    // Check continuity: last completed week should be the previous week or this is first
    const currentNum = weekToNum(weekStr);
    const lastNum = weekToNum(lastCompleted);

    if (!lastCompleted || currentNum === lastNum + 1) {
      streak += 1;
    } else {
      streak = 1;
    }

    if (streak > longest) longest = streak;
    lastCompleted = weekStr;
  }

  // Prune old weeks (keep only current and previous)
  const currentNum = weekToNum(weekStr);
  for (const k of Object.keys(studyDays)) {
    if (weekToNum(k) < currentNum - 1) delete studyDays[k];
  }

  // Check for broken streak: if we're in a new week and the previous week wasn't completed
  if (lastCompleted) {
    const lastNum = weekToNum(lastCompleted);
    if (currentNum > lastNum + 1) {
      streak = 0;
    }
  }

  db.prepare(
    `UPDATE weekly_streaks SET
       current_weekly_streak = ?, longest_weekly_streak = ?,
       week_study_days = ?, last_week_completed = ?
     WHERE profile_id = ?`
  ).run(streak, longest, JSON.stringify(studyDays), lastCompleted, profileId);
}

/**
 * Get weekly streak data for a profile.
 */
export function getWeeklyStreak(profileId) {
  db.prepare(
    `INSERT OR IGNORE INTO weekly_streaks (profile_id, week_study_days, last_week_completed)
     VALUES (?, '{}', NULL)`
  ).run(profileId);

  const row = db.prepare('SELECT * FROM weekly_streaks WHERE profile_id = ?').get(profileId);
  const { weekStr } = getISOWeekInfo();
  let studyDays = {};
  try { studyDays = JSON.parse(row.week_study_days || '{}'); } catch { studyDays = {}; }
  const daysThisWeek = studyDays[weekStr] || [];

  return {
    currentWeeklyStreak: row.current_weekly_streak,
    longestWeeklyStreak: row.longest_weekly_streak,
    daysStudiedThisWeek: daysThisWeek.length,
    daysRequired: 4,
    streakFreezes: row.streak_freezes
  };
}

function ensureProfileStats(profileId) {
  db.prepare(
    `INSERT OR IGNORE INTO profile_stats (profile_id, total_sessions, total_cards_studied, current_streak, longest_streak)
     VALUES (?, 0, 0, 0, 0)`
  ).run(profileId);
}
