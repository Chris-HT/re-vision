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
  'ALTER TABLE profiles ADD COLUMN literal_language INTEGER DEFAULT 0',
  'ALTER TABLE profiles ADD COLUMN focus_mode INTEGER DEFAULT 0',
  'ALTER TABLE profiles ADD COLUMN break_interval INTEGER DEFAULT 15',
  "ALTER TABLE profiles ADD COLUMN session_preset TEXT DEFAULT 'standard'",
  'ALTER TABLE profiles ADD COLUMN variable_rewards INTEGER DEFAULT 1'
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

// Token system tables
db.exec(`
  CREATE TABLE IF NOT EXISTS profile_tokens (
    profile_id TEXT PRIMARY KEY,
    tokens INTEGER DEFAULT 0,
    daily_earned INTEGER DEFAULT 0,
    daily_reset_date TEXT,
    token_rate REAL DEFAULT 0.10
  );
  CREATE TABLE IF NOT EXISTS token_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT,
    amount INTEGER,
    reason TEXT,
    session_id TEXT,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS token_test_history (
    profile_id TEXT,
    test_key TEXT,
    times_completed INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    PRIMARY KEY(profile_id, test_key)
  );
`);

// Weekly streaks table
db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_streaks (
    profile_id TEXT PRIMARY KEY,
    current_weekly_streak INTEGER DEFAULT 0,
    longest_weekly_streak INTEGER DEFAULT 0,
    week_study_days TEXT,
    last_week_completed TEXT,
    streak_freezes INTEGER DEFAULT 0
  );
`);

// Quest system tables
db.exec(`
  CREATE TABLE IF NOT EXISTS quest_definitions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target INTEGER NOT NULL,
    metric TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 25,
    coin_reward INTEGER DEFAULT 15
  );
  CREATE TABLE IF NOT EXISTS profile_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    assigned_date TEXT NOT NULL,
    completed_at TEXT,
    UNIQUE(profile_id, quest_id, assigned_date)
  );
  CREATE TABLE IF NOT EXISTS profile_reward_state (
    profile_id TEXT PRIMARY KEY,
    last_session_date TEXT,
    daily_bonus_used TEXT,
    variable_rewards INTEGER DEFAULT 1
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

// Seed quest definitions
const seedQuests = [
  ['daily-session',    'daily',  'Complete 1 study session',        'Finish any study session today',          1,  'sessions_completed',  25, 15],
  ['daily-cards-10',   'daily',  'Review 10 cards',                 'Review 10 flashcards today',              10, 'cards_reviewed',      25, 15],
  ['daily-correct-5',  'daily',  'Answer 5 questions correctly',    'Get 5 correct answers today',             5,  'correct_answers',     25, 15],
  ['daily-correct-15', 'daily',  'Answer 15 questions correctly',   'Get 15 correct answers today',            15, 'correct_answers',     40, 25],
  ['daily-test',       'daily',  'Complete a test',                 'Finish a dynamic test today',             1,  'tests_completed',     30, 20],
  ['daily-score-80',   'daily',  'Score 80%+ on a test',            'Achieve 80% or higher on any test today', 1,  'score_above_80',      40, 25],
  ['weekly-tests-3',   'weekly', 'Complete 3 tests this week',      'Finish 3 dynamic tests this week',        3,  'tests_completed',     75, 50],
  ['weekly-subjects-2','weekly', 'Study 2 different subjects',      'Study at least 2 subjects this week',     2,  'subjects_studied',    60, 40],
];
const insertQuest = db.prepare(
  'INSERT OR IGNORE INTO quest_definitions (id, type, title, description, target, metric, xp_reward, coin_reward) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
for (const q of seedQuests) {
  insertQuest.run(...q);
}

export default db;
