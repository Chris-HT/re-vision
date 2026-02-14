import db from '../db/index.js';

/**
 * Get all subjects with their themes.
 * Returns the same shape as the old subjects.json: { subjects: [...] }
 */
export function getAllSubjects() {
  const subjects = db.prepare('SELECT * FROM subjects').all();
  const themesStmt = db.prepare('SELECT * FROM themes WHERE subject_id = ?');

  return {
    subjects: subjects.map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      description: s.description,
      ageGroup: s.age_group,
      themes: themesStmt.all(s.id).map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        questionFile: t.question_file
      }))
    }))
  };
}

/**
 * Get a single subject by ID (with themes).
 */
export function getSubject(subjectId) {
  const s = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId);
  if (!s) return null;

  const themes = db.prepare('SELECT * FROM themes WHERE subject_id = ?').all(subjectId);
  return {
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    ageGroup: s.age_group,
    themes: themes.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      questionFile: t.question_file
    }))
  };
}

/**
 * Get questions for a subject, optionally filtered by theme.
 * Returns { subject, theme, categories, questions }.
 */
export function getQuestions(subjectId, themeId) {
  const subject = getSubject(subjectId);
  if (!subject) return null;

  const themesToLoad = themeId
    ? subject.themes.filter(t => t.id === themeId)
    : subject.themes;

  if (themeId && themesToLoad.length === 0) return { notFound: 'theme' };

  const themeIds = themesToLoad.map(t => t.id);
  const placeholders = themeIds.map(() => '?').join(',');

  const questions = db.prepare(
    `SELECT * FROM questions WHERE subject_id = ? AND theme_id IN (${placeholders})`
  ).all(subjectId, ...themeIds);

  // Build categories from the categories table
  const catRows = db.prepare(
    `SELECT * FROM categories WHERE subject_id = ? AND theme_id IN (${placeholders})`
  ).all(subjectId, ...themeIds);

  const categories = {};
  for (const c of catRows) {
    categories[c.name] = {
      color: c.color,
      bgClass: c.bg_class,
      lightClass: c.light_class,
      borderClass: c.border_class,
      textClass: c.text_class
    };
  }

  return {
    subject: subjectId,
    theme: themeId || 'all',
    categories,
    questions: questions.map(q => ({
      id: q.id,
      category: q.category,
      question: q.question,
      answer: q.answer,
      difficulty: q.difficulty,
      tags: q.tags ? JSON.parse(q.tags) : [],
      format: q.format,
      ...(q.options ? { options: JSON.parse(q.options) } : {}),
      ...(q.correct_option ? { correctOption: q.correct_option } : {})
    }))
  };
}

/**
 * Save generated questions to the question bank (used by POST /api/generate/save).
 */
export function saveGeneratedQuestions({ subjectId, themeId, questions, subjectMetadata, themeMetadata }) {
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
  const existingIds = new Set(
    db.prepare('SELECT id FROM questions WHERE subject_id = ? AND theme_id = ?')
      .all(subjectId, themeId)
      .map(r => r.id)
  );

  const transaction = db.transaction(() => {
    // Ensure subject exists
    const existingSubject = db.prepare('SELECT id FROM subjects WHERE id = ?').get(subjectId);
    if (!existingSubject) {
      insertSubject.run(
        subjectId,
        subjectMetadata?.name || subjectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        subjectMetadata?.icon || '📚',
        subjectMetadata?.description || 'Generated subject',
        subjectMetadata?.ageGroup || 'all'
      );
    }

    // Ensure theme exists
    const existingTheme = db.prepare('SELECT id FROM themes WHERE subject_id = ? AND id = ?').get(subjectId, themeId);
    if (!existingTheme) {
      const questionFileName = `${subjectId}-${themeId}.json`;
      insertTheme.run(
        themeId,
        subjectId,
        themeMetadata?.name || themeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        themeMetadata?.color || 'from-blue-500 to-purple-500',
        questionFileName
      );
    }

    // Insert questions
    let counter = existingIds.size + 1;
    const newQuestions = [];

    for (const q of questions) {
      let id = q.id;
      while (existingIds.has(id)) {
        id = `${subjectId.substring(0, 3)}-${String(counter++).padStart(3, '0')}`;
      }
      existingIds.add(id);

      // Ensure category exists
      const colors = ['purple', 'blue', 'green', 'cyan', 'indigo', 'violet'];
      const catCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM categories WHERE subject_id = ? AND theme_id = ?'
      ).get(subjectId, themeId).cnt;

      const color = colors[catCount % colors.length];
      insertCategory.run(
        q.category || 'General',
        subjectId,
        themeId,
        `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        `bg-${color}-500`,
        `bg-${color}-50`,
        `border-${color}-300`,
        `text-${color}-700`
      );

      insertQuestion.run(
        id, subjectId, themeId,
        q.category || 'General',
        q.question, q.answer,
        q.difficulty || 1,
        q.tags ? JSON.stringify(q.tags) : null,
        q.format || 'flashcard',
        q.options ? JSON.stringify(q.options) : null,
        q.correctOption || null
      );

      newQuestions.push({ ...q, id });
    }

    return newQuestions;
  });

  const saved = transaction();
  return { savedCount: saved.length };
}

/**
 * Export a subject bundle (same shape as GET /api/subjects/:subjectId/export).
 */
export function exportSubject(subjectId) {
  const subject = getSubject(subjectId);
  if (!subject) return null;

  const bundle = {
    exportVersion: 1,
    exportDate: new Date().toISOString(),
    subject: { ...subject },
    questionFiles: {}
  };

  // Group questions by theme and reconstruct question file format
  for (const theme of subject.themes) {
    const questionsData = getQuestions(subjectId, theme.id);
    if (questionsData && questionsData.questions.length > 0) {
      bundle.questionFiles[theme.questionFile] = {
        meta: {
          subject: subjectId,
          theme: theme.id,
          version: 1,
          lastUpdated: new Date().toISOString().split('T')[0]
        },
        categories: questionsData.categories,
        questions: questionsData.questions
      };
    }
  }

  return bundle;
}

/**
 * Import a subject bundle.
 */
export function importSubject(bundle) {
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

  const transaction = db.transaction(() => {
    let subjectId = bundle.subject.id;

    // Handle ID collision
    const existing = db.prepare('SELECT id FROM subjects WHERE id = ?').get(subjectId);
    if (existing) {
      subjectId = `imp-${subjectId}`;
      bundle.subject.id = subjectId;
      bundle.subject.name = `${bundle.subject.name} (Imported)`;
    }

    insertSubject.run(
      subjectId,
      bundle.subject.name,
      bundle.subject.icon || '📚',
      bundle.subject.description || '',
      bundle.subject.ageGroup || 'all'
    );

    // Insert themes
    for (const theme of bundle.subject.themes) {
      insertTheme.run(theme.id, subjectId, theme.name, theme.color, theme.questionFile);
    }

    // Insert question files
    let totalQuestions = 0;
    for (const [filename, questionData] of Object.entries(bundle.questionFiles)) {
      // Find which theme this file belongs to
      const theme = bundle.subject.themes.find(t => t.questionFile === filename);
      const themeId = theme?.id || 'unknown';

      // Insert categories
      if (questionData.categories) {
        for (const [catName, cat] of Object.entries(questionData.categories)) {
          insertCategory.run(
            catName, subjectId, themeId,
            cat.color, cat.bgClass, cat.lightClass, cat.borderClass, cat.textClass
          );
        }
      }

      // Insert questions
      if (questionData.questions) {
        for (const q of questionData.questions) {
          const id = q.id.startsWith('imp-') ? q.id : `imp-${q.id}`;
          insertQuestion.run(
            id, subjectId, themeId,
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

    return { subjectId, totalQuestions };
  });

  return transaction();
}
