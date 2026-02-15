/**
 * Streak tracking logic for spaced repetition sessions.
 */

function toDateString(isoString) {
  return new Date(isoString).toISOString().split('T')[0];
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

/**
 * Update the stats object after a card is answered.
 * @param {object} stats - The profile stats object
 * @param {boolean} isNewSession - Whether this is the first card in a new session
 * @returns {object} Updated stats
 */
export function updateStats(stats, isNewSession) {
  const today = toDateString(new Date().toISOString());

  stats.totalCardsStudied = (stats.totalCardsStudied || 0) + 1;

  if (isNewSession) {
    stats.totalSessions = (stats.totalSessions || 0) + 1;
  }

  // Update streak
  const lastDate = stats.lastSessionDate
    ? toDateString(stats.lastSessionDate)
    : null;

  if (lastDate !== today) {
    if (lastDate && daysBetween(today, lastDate) === 1) {
      // Consecutive day — increment streak
      stats.currentStreak = (stats.currentStreak || 0) + 1;
    } else if (!lastDate || daysBetween(today, lastDate) > 1) {
      // First session ever, or gap > 1 day — reset streak
      stats.currentStreak = 1;
    }
    // If same day, don't change streak
  }

  stats.longestStreak = Math.max(
    stats.longestStreak || 0,
    stats.currentStreak || 0
  );

  stats.lastSessionDate = new Date().toISOString();

  return stats;
}

/**
 * Create a default empty stats object.
 */
export function createStats() {
  return {
    totalSessions: 0,
    totalCardsStudied: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: null
  };
}
