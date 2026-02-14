-- RE-VISION SQLite Schema

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📚',
  description TEXT,
  age_group TEXT DEFAULT 'all'
);

CREATE TABLE IF NOT EXISTS themes (
  id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  question_file TEXT,
  PRIMARY KEY (subject_id, id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS categories (
  name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  color TEXT,
  bg_class TEXT,
  light_class TEXT,
  border_class TEXT,
  text_class TEXT,
  PRIMARY KEY (subject_id, theme_id, name),
  FOREIGN KEY (subject_id, theme_id) REFERENCES themes(subject_id, id)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  tags TEXT,
  format TEXT DEFAULT 'flashcard',
  options TEXT,
  correct_option TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_theme ON questions(subject_id, theme_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📚',
  default_subjects TEXT,
  age_group TEXT NOT NULL DEFAULT 'adult',
  theme TEXT DEFAULT 'dark',
  favourites TEXT
);

CREATE TABLE IF NOT EXISTS card_progress (
  profile_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  last_seen TEXT,
  next_due TEXT,
  interval INTEGER DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  PRIMARY KEY (profile_id, card_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_card_progress_due ON card_progress(profile_id, next_due);

CREATE TABLE IF NOT EXISTS card_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  date TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('correct', 'incorrect', 'skipped')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_history_unique ON card_history(profile_id, card_id, date, result);
CREATE INDEX IF NOT EXISTS idx_card_history_profile ON card_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_card_history_date ON card_history(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_card_history_card ON card_history(profile_id, card_id);

CREATE TABLE IF NOT EXISTS profile_stats (
  profile_id TEXT PRIMARY KEY,
  total_sessions INTEGER DEFAULT 0,
  total_cards_studied INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_session_date TEXT,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS generated_cache (
  cache_key TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  age_group TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  count INTEGER NOT NULL,
  format TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  age_group TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  format TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  score INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  questions_data TEXT NOT NULL,
  answers_data TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_profile ON test_sessions(profile_id, completed_at);

CREATE TABLE IF NOT EXISTS test_reports (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  profile_id TEXT NOT NULL,
  report_data TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_test_reports_profile ON test_reports(profile_id, generated_at);

CREATE TABLE IF NOT EXISTS learning_profiles (
  profile_id TEXT PRIMARY KEY,
  weak_areas TEXT NOT NULL DEFAULT '[]',
  strong_areas TEXT NOT NULL DEFAULT '[]',
  topics_tested TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
