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

  const historyStmt = db.prepare(
    'SELECT date, result FROM card_history WHERE profile_id = ? AND card_id = ? ORDER BY id DESC LIMIT 20'
  );

  const cards = {};
  for (const c of cardRows) {
    const history = historyStmt.all(profileId, c.card_id);
    cards[c.card_id] = {
      lastSeen: c.last_seen,
      nextDue: c.next_due,
      interval: c.interval,
      easeFactor: c.ease_factor,
      repetitions: c.repetitions,
      history
    };
  }

  const stats = getStats(profileId);

  return { profileId, cards, stats };
}

/**
 * Record a card review (replaces PUT /progress/:profileId/card/:cardId).
 */
export function recordCardReview(profileId, cardId, result) {
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

  return { card, stats };
}

/**
 * Get cards due for review.
 */
export function getDueCards(profileId, themeList, maxCards) {
  const now = new Date().toISOString();

  // Get all question IDs, optionally filtered by themes
  let questionIds;
  if (themeList) {
    const placeholders = themeList.map(() => '?').join(',');
    questionIds = db.prepare(
      `SELECT id FROM questions WHERE theme_id IN (${placeholders})`
    ).all(...themeList).map(r => r.id);
  } else {
    questionIds = db.prepare('SELECT id FROM questions').all().map(r => r.id);
  }

  const allQuestionIdSet = new Set(questionIds);

  // Get cards with progress data
  const progressRows = db.prepare(
    'SELECT card_id, next_due, last_seen FROM card_progress WHERE profile_id = ?'
  ).all(profileId);

  const seenCardIds = new Set();
  const dueCards = [];

  for (const row of progressRows) {
    if (!allQuestionIdSet.has(row.card_id)) continue;
    seenCardIds.add(row.card_id);
    if (row.last_seen && row.next_due && row.next_due <= now) {
      dueCards.push({ id: row.card_id, nextDue: row.next_due });
    }
  }

  // Unseen cards
  const unseenCards = questionIds.filter(id => !seenCardIds.has(id));

  // Sort due cards by most overdue first
  dueCards.sort((a, b) => a.nextDue.localeCompare(b.nextDue));

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

function ensureProfileStats(profileId) {
  db.prepare(
    `INSERT OR IGNORE INTO profile_stats (profile_id, total_sessions, total_cards_studied, current_streak, longest_streak)
     VALUES (?, 0, 0, 0, 0)`
  ).run(profileId);
}
