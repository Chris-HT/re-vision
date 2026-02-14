import db from '../db/index.js';

export function saveTestSession(id, profileId, testData, answers, score) {
  db.prepare(
    `INSERT INTO test_sessions (id, profile_id, topic, age_group, difficulty, format, question_count, score, completed_at, questions_data, answers_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    profileId,
    testData.meta.topic,
    testData.meta.ageGroup,
    testData.meta.difficulty,
    testData.meta.format || 'mix',
    testData.questions.length,
    score,
    new Date().toISOString(),
    JSON.stringify(testData.questions),
    JSON.stringify(answers)
  );
}

export function saveTestReport(id, sessionId, profileId, reportData) {
  db.prepare(
    `INSERT INTO test_reports (id, session_id, profile_id, report_data, generated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, sessionId, profileId, JSON.stringify(reportData), new Date().toISOString());
}

export function getReportsForProfile(profileId, limit = 10) {
  const rows = db.prepare(
    `SELECT r.id, r.session_id, r.report_data, r.generated_at,
            s.topic, s.score, s.question_count, s.difficulty, s.format
     FROM test_reports r
     JOIN test_sessions s ON r.session_id = s.id
     WHERE r.profile_id = ?
     ORDER BY r.generated_at DESC
     LIMIT ?`
  ).all(profileId, limit);

  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    report: JSON.parse(r.report_data),
    generatedAt: r.generated_at,
    topic: r.topic,
    score: r.score,
    questionCount: r.question_count,
    difficulty: r.difficulty,
    format: r.format
  }));
}

export function getReportBySessionId(sessionId) {
  const row = db.prepare(
    `SELECT r.id, r.session_id, r.report_data, r.generated_at,
            s.topic, s.score, s.question_count, s.difficulty, s.format
     FROM test_reports r
     JOIN test_sessions s ON r.session_id = s.id
     WHERE r.session_id = ?`
  ).get(sessionId);

  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    report: JSON.parse(row.report_data),
    generatedAt: row.generated_at,
    topic: row.topic,
    score: row.score,
    questionCount: row.question_count,
    difficulty: row.difficulty,
    format: row.format
  };
}

export function getLearningProfile(profileId) {
  let row = db.prepare(
    'SELECT * FROM learning_profiles WHERE profile_id = ?'
  ).get(profileId);

  if (!row) {
    db.prepare(
      `INSERT INTO learning_profiles (profile_id, weak_areas, strong_areas, topics_tested, updated_at)
       VALUES (?, '[]', '[]', '[]', ?)`
    ).run(profileId, new Date().toISOString());

    return {
      profileId,
      weakAreas: [],
      strongAreas: [],
      topicsTested: [],
      updatedAt: new Date().toISOString()
    };
  }

  return {
    profileId: row.profile_id,
    weakAreas: JSON.parse(row.weak_areas),
    strongAreas: JSON.parse(row.strong_areas),
    topicsTested: JSON.parse(row.topics_tested),
    updatedAt: row.updated_at
  };
}

export function updateLearningProfile(profileId, reportData, topic) {
  const current = getLearningProfile(profileId);

  // Merge weak areas - keep most recent by area name
  const weakMap = new Map();
  for (const area of current.weakAreas) {
    weakMap.set(area.area, area);
  }
  if (reportData.weakAreas) {
    for (const area of reportData.weakAreas) {
      weakMap.set(area.area, {
        area: area.area,
        reason: area.reason,
        suggestion: area.suggestion,
        lastTested: new Date().toISOString()
      });
    }
  }

  // Remove from weak areas if now in strengths
  const strongSet = new Set();
  if (reportData.strengths) {
    for (const s of reportData.strengths) {
      strongSet.add(s);
      weakMap.delete(s);
    }
  }

  // Merge strong areas
  const strongMap = new Map();
  for (const area of current.strongAreas) {
    strongMap.set(area.area, area);
  }
  for (const s of strongSet) {
    strongMap.set(s, {
      area: s,
      lastTested: new Date().toISOString()
    });
  }

  // Merge topics
  const topicsSet = new Set(current.topicsTested);
  if (topic) topicsSet.add(topic);

  const weakAreas = Array.from(weakMap.values());
  const strongAreas = Array.from(strongMap.values());
  const topicsTested = Array.from(topicsSet);

  db.prepare(
    `UPDATE learning_profiles
     SET weak_areas = ?, strong_areas = ?, topics_tested = ?, updated_at = ?
     WHERE profile_id = ?`
  ).run(
    JSON.stringify(weakAreas),
    JSON.stringify(strongAreas),
    JSON.stringify(topicsTested),
    new Date().toISOString(),
    profileId
  );

  return { profileId, weakAreas, strongAreas, topicsTested };
}
