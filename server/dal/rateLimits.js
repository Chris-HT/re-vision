import db from '../db/index.js';

// Returns true if key is currently locked out
export function isLocked(key) {
  const row = db.prepare('SELECT locked_until FROM rate_limits WHERE key = ?').get(key);
  if (!row?.locked_until) return false;
  if (Date.now() < row.locked_until) return true;
  db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key); // expired
  return false;
}

// Increments attempt count; locks the key if maxAttempts reached.
// Returns the current attempt count after incrementing.
export function recordAttempt(key, maxAttempts, lockDurationMs) {
  const now = Date.now();
  const row = db.prepare('SELECT count, locked_until FROM rate_limits WHERE key = ?').get(key);
  if (row?.locked_until && now >= row.locked_until) {
    // Expired lock — reset
    db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
  }
  db.prepare(`
    INSERT INTO rate_limits (key, count) VALUES (?, 1)
    ON CONFLICT(key) DO UPDATE SET count = count + 1
  `).run(key);
  const updated = db.prepare('SELECT count FROM rate_limits WHERE key = ?').get(key);
  if (updated?.count >= maxAttempts) {
    db.prepare('UPDATE rate_limits SET locked_until = ? WHERE key = ?').run(now + lockDurationMs, key);
  }
  return updated?.count ?? 0;
}

// Clears lock/count for a key (called on successful login)
export function clearAttempts(key) {
  db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
}

// Checks + increments a rolling call-count window; returns false if over limit
export function checkAndIncrementCallLimit(key, maxCalls, windowMs) {
  const now = Date.now();
  const row = db.prepare('SELECT count, window_expires FROM rate_limits WHERE key = ?').get(key);
  if (!row || now > row.window_expires) {
    db.prepare(`
      INSERT INTO rate_limits (key, count, window_expires) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = 1, window_expires = excluded.window_expires
    `).run(key, now + windowMs);
    return true;
  }
  if (row.count >= maxCalls) return false;
  db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').run(key);
  return true;
}
