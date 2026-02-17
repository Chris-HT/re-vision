/**
 * Simplified SM-2 spaced repetition algorithm.
 * Tracks per-card interval, ease factor, and repetition count.
 */

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Create a fresh card progress entry for an unseen card.
 */
export function createCard() {
  return {
    lastSeen: null,
    nextDue: null,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    history: []
  };
}

/**
 * Update a card's spaced repetition data after the user answers.
 * @param {object} card - The card progress object
 * @param {"correct"|"incorrect"|"skipped"} result
 * @returns {object} Updated card
 */
export function updateCard(card, result) {
  const now = new Date().toISOString();

  if (result === 'correct') {
    card.repetitions += 1;
    if (card.repetitions === 1) {
      card.interval = 1;
    } else if (card.repetitions === 2) {
      card.interval = 3;
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.easeFactor = Math.max(1.3, card.easeFactor + 0.1);
  } else if (result === 'incorrect') {
    card.repetitions = 0;
    card.interval = 1;
    card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
  } else if (result === 'skipped') {
    // Skipped means the user doesn't know the answer — reschedule for tomorrow
    // regardless of the card's current interval (don't let a 30-day card stay
    // hidden for 30 more days just because it was skipped)
    card.interval = 1;
  }

  card.lastSeen = now;
  card.nextDue = addDays(now, card.interval || 1);
  card.history.unshift({ date: now, result });

  // Cap history at last 20 entries
  if (card.history.length > 20) {
    card.history = card.history.slice(0, 20);
  }

  return card;
}
