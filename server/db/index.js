import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/revision.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Add auth columns (safe to re-run — catches "duplicate column" errors)
const alterStatements = [
  'ALTER TABLE profiles ADD COLUMN pin_hash TEXT',
  "ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'child'",
  "ALTER TABLE profiles ADD COLUMN font_size TEXT DEFAULT 'medium'",
  'ALTER TABLE profiles ADD COLUMN reduce_animations INTEGER DEFAULT 0',
  'ALTER TABLE profiles ADD COLUMN literal_language INTEGER DEFAULT 0'
];
for (const sql of alterStatements) {
  try { db.exec(sql); } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }
}

// Gamification tables
db.exec(`
  CREATE TABLE IF NOT EXISTS profile_xp (
    profile_id TEXT PRIMARY KEY,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS subject_xp (
    profile_id TEXT,
    subject_id TEXT,
    xp INTEGER DEFAULT 0,
    PRIMARY KEY(profile_id, subject_id)
  );
  CREATE TABLE IF NOT EXISTS profile_coins (
    profile_id TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS coin_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT,
    amount INTEGER,
    reason TEXT,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    icon TEXT,
    category TEXT,
    threshold INTEGER
  );
  CREATE TABLE IF NOT EXISTS profile_achievements (
    profile_id TEXT,
    achievement_id TEXT,
    unlocked_at TEXT,
    PRIMARY KEY(profile_id, achievement_id)
  );
`);

// Seed achievements
const seedAchievements = [
  ['first-card',    'First Steps',    'Review your first card',    '👶', 'cards',   1],
  ['ten-cards',     'Getting Started','Review 10 cards',           '📚', 'cards',   10],
  ['hundred-cards', 'Card Crusher',   'Review 100 cards',          '💪', 'cards',   100],
  ['first-test',    'Test Taker',     'Complete your first test',  '📝', 'tests',   1],
  ['five-tests',    'Test Veteran',   'Complete 5 tests',          '🏆', 'tests',   5],
  ['perfect-score', 'Perfection',     'Score 100% on a test',      '⭐', 'score',   100],
  ['three-streak',  'On a Roll',      '3-day study streak',        '🔥', 'streaks', 3],
  ['seven-streak',  'Week Warrior',   '7-day study streak',        '💥', 'streaks', 7],
  ['level-five',    'Rising Star',    'Reach level 5',             '🌟', 'levels',  5],
  ['level-ten',     'Scholar',        'Reach level 10',            '🎓', 'levels',  10],
];
const insertAchievement = db.prepare(
  'INSERT OR IGNORE INTO achievements (id, name, description, icon, category, threshold) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const a of seedAchievements) {
  insertAchievement.run(...a);
}

export default db;
