/**
 * One-time migration: import existing JSON data into SQLite.
 *
 * Usage:  node server/db/migrate-json.js
 *
 * Idempotent — delete data/revision.db and re-run to start fresh.
 * Original JSON files are never deleted.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../../data');

function migrate() {
  console.log('Starting JSON → SQLite migration...\n');

  // ── 1. Profiles ──────────────────────────────────────────
  const profilesFile = path.join(dataPath, 'profiles.json');
  if (fs.existsSync(profilesFile)) {
    const { profiles } = JSON.parse(fs.readFileSync(profilesFile, 'utf-8'));
    const insertProfile = db.prepare(
      `INSERT OR IGNORE INTO profiles (id, name, icon, default_subjects, age_group, theme, favourites)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const p of profiles) {
      insertProfile.run(
        p.id, p.name, p.icon,
        JSON.stringify(p.defaultSubjects || []),
        p.ageGroup || 'adult',
        p.theme || 'dark',
        JSON.stringify(p.favourites || [])
      );
    }
    console.log(`  Profiles: ${profiles.length} imported`);
  }

  // ── 2. Subjects, themes, categories, questions ───────────
  const subjectsFile = path.join(dataPath, 'subjects.json');
  if (fs.existsSync(subjectsFile)) {
    const { subjects } = JSON.parse(fs.readFileSync(subjectsFile, 'utf-8'));

    const insertSubject = db.prepare(
      `INSERT OR IGNORE INTO subjects (id, name, icon, description, age_group) VALUES (?, ?, ?, ?, ?)`
    );
    const insertTheme = db.prepare(
      `INSERT OR IGNORE INTO themes (id, subject_id, name, color, question_file) VALUES (?, ?, ?, ?, ?)`
    );
    const insertCategory = db.prepare(
      `INSERT OR IGNORE INTO categories (name, subject_id, theme_id, color, bg_class, light_class, border_class, text_class)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertQuestion = db.prepare(
      `INSERT OR IGNORE INTO questions (id, subject_id, theme_id, category, question, answer, difficulty, tags, format, options, correct_option)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let totalQuestions = 0;

    const transaction = db.transaction(() => {
      for (const subject of subjects) {
        insertSubject.run(subject.id, subject.name, subject.icon, subject.description, subject.ageGroup || 'all');

        for (const theme of subject.themes) {
          insertTheme.run(theme.id, subject.id, theme.name, theme.color, theme.questionFile);

          // Load the question file
          const questionFilePath = path.join(dataPath, 'questions', theme.questionFile);
          if (!fs.existsSync(questionFilePath)) {
            console.log(`  Warning: ${theme.questionFile} not found, skipping`);
            continue;
          }

          const questionData = JSON.parse(fs.readFileSync(questionFilePath, 'utf-8'));

          // Categories
          if (questionData.categories) {
            for (const [catName, cat] of Object.entries(questionData.categories)) {
              insertCategory.run(
                catName, subject.id, theme.id,
                cat.color, cat.bgClass, cat.lightClass, cat.borderClass, cat.textClass
              );
            }
          }

          // Questions — check for global ID collisions and prefix if needed
          if (questionData.questions) {
            for (const q of questionData.questions) {
              let id = q.id;
              const existing = db.prepare('SELECT id, subject_id, theme_id FROM questions WHERE id = ?').get(id);
              if (existing && (existing.subject_id !== subject.id || existing.theme_id !== theme.id)) {
                const newId = `${subject.id}-${theme.id}-${id}`;
                console.log(`  Warning: Question ID "${id}" collides across themes, remapped to "${newId}"`);
                id = newId;
              }
              insertQuestion.run(
                id, subject.id, theme.id,
                q.category, q.question, q.answer,
                q.difficulty || 1,
                q.tags ? JSON.stringify(q.tags) : null,
                q.format || 'flashcard',
                q.options ? JSON.stringify(q.options) : null,
                q.correctOption || null
              );
              totalQuestions++;
            }
          }
        }
      }
    });

    transaction();
    console.log(`  Subjects: ${subjects.length} imported`);
    console.log(`  Questions: ${totalQuestions} imported`);
  }

  // ── 3. Progress data ─────────────────────────────────────
  const progressDir = path.join(dataPath, 'progress');
  if (fs.existsSync(progressDir)) {
    const files = fs.readdirSync(progressDir).filter(f => f.endsWith('.json'));

    const insertProgress = db.prepare(
      `INSERT OR IGNORE INTO card_progress (profile_id, card_id, last_seen, next_due, interval, ease_factor, repetitions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insertHistory = db.prepare(
      `INSERT OR IGNORE INTO card_history (profile_id, card_id, date, result) VALUES (?, ?, ?, ?)`
    );
    const insertStats = db.prepare(
      `INSERT OR IGNORE INTO profile_stats (profile_id, total_sessions, total_cards_studied, current_streak, longest_streak, last_session_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    let totalCards = 0;
    let totalHistoryEntries = 0;

    const transaction = db.transaction(() => {
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(progressDir, file), 'utf-8'));
        const profileId = data.profileId || file.replace('.json', '');

        // Card progress + history
        if (data.cards) {
          for (const [cardId, card] of Object.entries(data.cards)) {
            insertProgress.run(
              profileId, cardId,
              card.lastSeen, card.nextDue,
              card.interval || 0,
              card.easeFactor || 2.5,
              card.repetitions || 0
            );
            totalCards++;

            // Import history entries — reverse from newest-first to oldest-first
            // so that autoincrement IDs align with ORDER BY id DESC (newest first)
            if (card.history) {
              const entries = [...card.history].reverse();
              for (const entry of entries) {
                insertHistory.run(profileId, cardId, entry.date, entry.result);
                totalHistoryEntries++;
              }
            }
          }
        }

        // Stats
        if (data.stats) {
          insertStats.run(
            profileId,
            data.stats.totalSessions || 0,
            data.stats.totalCardsStudied || 0,
            data.stats.currentStreak || 0,
            data.stats.longestStreak || 0,
            data.stats.lastSessionDate || null
          );
        }
      }
    });

    transaction();
    console.log(`  Progress: ${totalCards} card records, ${totalHistoryEntries} history entries`);
  }

  // ── 4. Generated question cache ──────────────────────────
  const generatedDir = path.join(dataPath, 'questions', 'generated');
  const indexFile = path.join(generatedDir, 'index.json');
  if (fs.existsSync(indexFile)) {
    const { generations } = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));

    const insertCache = db.prepare(
      `INSERT OR IGNORE INTO generated_cache (cache_key, topic, age_group, difficulty, count, format, generated_at, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let cached = 0;

    const transaction = db.transaction(() => {
      for (const gen of generations) {
        const cacheFile = path.join(generatedDir, `${gen.cacheKey}.json`);
        if (!fs.existsSync(cacheFile)) continue;

        const data = fs.readFileSync(cacheFile, 'utf-8');
        insertCache.run(
          gen.cacheKey, gen.topic, gen.ageGroup,
          gen.difficulty, gen.count, gen.format,
          gen.generatedAt, data
        );
        cached++;
      }
    });

    transaction();
    console.log(`  Cache: ${cached} generated question sets imported`);
  }

  // ── 5. Roles and parent-child links ──────────────────────
  console.log('\n  Setting roles and parent-child links...');
  db.prepare("UPDATE profiles SET role = 'admin' WHERE id = 'dad'").run();
  db.prepare("UPDATE profiles SET role = 'child' WHERE id IN ('child1', 'child2')").run();

  const insertLink = db.prepare(
    'INSERT OR IGNORE INTO parent_child (parent_id, child_id) VALUES (?, ?)'
  );
  insertLink.run('dad', 'child1');
  insertLink.run('dad', 'child2');
  console.log('  Roles: dad=admin, child1=child, child2=child');
  console.log('  Parent-child links: dad→child1, dad→child2');

  console.log('\nMigration complete! JSON files preserved as backup.');
}

migrate();
