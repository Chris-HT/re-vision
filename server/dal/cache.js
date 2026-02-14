import db from '../db/index.js';

/**
 * Look up a cached generation by cache key.
 * Returns the parsed data object or null if not found.
 */
export function getCached(cacheKey) {
  const row = db.prepare('SELECT data FROM generated_cache WHERE cache_key = ?').get(cacheKey);
  return row ? JSON.parse(row.data) : null;
}

/**
 * Store a generated result in the cache.
 */
export function setCache(cacheKey, { topic, ageGroup, difficulty, count, format }, data) {
  db.prepare(
    `INSERT OR REPLACE INTO generated_cache (cache_key, topic, age_group, difficulty, count, format, generated_at, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(cacheKey, topic, ageGroup, difficulty, count, format, new Date().toISOString(), JSON.stringify(data));
}

/**
 * Get the index of all cached generations (replaces generated/index.json).
 */
export function getCacheIndex() {
  const rows = db.prepare(
    'SELECT cache_key, topic, age_group, difficulty, count, format, generated_at FROM generated_cache ORDER BY generated_at DESC'
  ).all();

  return {
    generations: rows.map(r => ({
      cacheKey: r.cache_key,
      topic: r.topic,
      ageGroup: r.age_group,
      difficulty: r.difficulty,
      count: r.count,
      format: r.format,
      generatedAt: r.generated_at
    }))
  };
}

/**
 * Get a single cached generation by key.
 */
export function getCachedGeneration(cacheKey) {
  const row = db.prepare('SELECT data FROM generated_cache WHERE cache_key = ?').get(cacheKey);
  return row ? JSON.parse(row.data) : null;
}
