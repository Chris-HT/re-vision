import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { getCached, setCache, getCacheIndex } from '../dal/cache.js';
import {
  saveTestSession, saveTestReport, getReportsForProfile,
  getLearningProfile, updateLearningProfile
} from '../dal/reports.js';
import { canAccessProfile } from '../middleware/auth.js';
import { awardXP, awardCoins, checkAndUnlockAchievements } from '../dal/gamification.js';
import { calculateTokenReward, awardTokens, recordTestCompletion } from '../dal/tokens.js';
import { incrementQuestProgress, updateLastSessionDate as updateQuestSessionDate } from '../dal/quests.js';

const router = express.Router();

// Allowlists for enum fields — reject anything unexpected before it reaches a prompt
const VALID_AGE_GROUPS = new Set(['primary', 'secondary', 'adult']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const VALID_FORMATS = new Set(['multiple_choice', 'free_text', 'mix', 'flashcard']);

// Hard length caps for all user-supplied text that enters a prompt
const MAX_TOPIC_LEN = 200;
const MAX_CONTEXT_LEN = 500;
const MAX_QUESTION_LEN = 500;
const MAX_ANSWER_LEN = 2000;

function cap(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLen);
}

// Lazy singleton — created once on first API call, reused thereafter
let anthropicClient = null;
function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// Per-profile rate limiting: each profile gets their own counter
const RATE_LIMIT_PER_PROFILE = 10;
const RATE_LIMIT_GLOBAL = 30;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour

const profileLimits = new Map(); // profileId -> { calls, resetTime }
let globalCalls = 0;
let globalResetTime = Date.now() + RATE_LIMIT_WINDOW;

function checkRateLimit(profileId) {
  const now = Date.now();

  // Reset global counter if window expired
  if (now > globalResetTime) {
    globalCalls = 0;
    globalResetTime = now + RATE_LIMIT_WINDOW;
  }

  // Check global limit
  if (globalCalls >= RATE_LIMIT_GLOBAL) return false;

  // Per-profile limit
  if (profileId) {
    let entry = profileLimits.get(profileId);
    if (!entry || now > entry.resetTime) {
      entry = { calls: 0, resetTime: now + RATE_LIMIT_WINDOW };
      profileLimits.set(profileId, entry);
    }
    if (entry.calls >= RATE_LIMIT_PER_PROFILE) return false;
    entry.calls++;
  }

  globalCalls++;
  return true;
}

router.post('/generate', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-your-key-here') {
      return res.status(400).json({
        error: 'API key not configured',
        code: 'NO_API_KEY',
        userMessage: 'Ask Dad to set up the API key 😄'
      });
    }

    const { topic, ageGroup, difficulty, count, format, additionalContext, literalLanguage } = req.body;

    if (!topic || !ageGroup || !difficulty || !count || !format) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_REQUEST'
      });
    }

    if (!VALID_AGE_GROUPS.has(ageGroup)) {
      return res.status(400).json({ error: 'Invalid ageGroup', code: 'INVALID_REQUEST' });
    }
    if (!VALID_DIFFICULTIES.has(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty', code: 'INVALID_REQUEST' });
    }
    if (!VALID_FORMATS.has(format)) {
      return res.status(400).json({ error: 'Invalid format', code: 'INVALID_REQUEST' });
    }

    const parsedCount = parseInt(count, 10);
    if (isNaN(parsedCount) || parsedCount < 5 || parsedCount > 20) {
      return res.status(400).json({
        error: 'Count must be an integer between 5 and 20',
        code: 'INVALID_COUNT'
      });
    }

    const safeTopic = cap(topic, MAX_TOPIC_LEN);
    const safeContext = cap(additionalContext, MAX_CONTEXT_LEN);

    const cacheKey = crypto.createHash('md5')
      .update(`${safeTopic}-${ageGroup}-${difficulty}-${parsedCount}-${format}`.toLowerCase())
      .digest('hex');

    // Check cache first — don't count cached requests against rate limit
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        ...cached
      });
    }

    if (!checkRateLimit(req.user?.profileId)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        userMessage: 'Too many requests. Please wait a few minutes and try again.'
      });
    }

    const anthropic = getAnthropicClient();

    let systemPrompt;

    const literalRule = literalLanguage
      ? '\nIMPORTANT: Use clear, direct language only. Do not use idioms, metaphors, sarcasm, or figurative speech.\n'
      : '';

    if (format === 'flashcard') {
      systemPrompt = `You are a flashcard generator for RE-VISION, a UK-based family revision app.

Generate exactly ${parsedCount} flashcard Q&A pairs on the topic: "${safeTopic}"
Target age group: ${ageGroup}
Difficulty: ${difficulty}

${safeContext ? "Additional context: " + safeContext : ""}${literalRule}

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation. Just the JSON object.

Schema:
{
  "meta": {
    "topic": "${safeTopic}",
    "ageGroup": "${ageGroup}",
    "difficulty": "${difficulty}",
    "generatedAt": "ISO date string"
  },
  "questions": [
    {
      "id": "gen-001",
      "category": "Subtopic Name",
      "question": "The question text",
      "answer": "The correct answer — concise but complete",
      "difficulty": 1,
      "tags": ["relevant", "tags"]
    }
  ]
}

Rules:
- Generate simple Q&A flashcard pairs. Do NOT include "options", "correctOption", or "format" fields.
- For "category": assign a meaningful subtopic grouping (e.g. for "Quadratics" the categories might be "Factorising", "Completing the Square", "The Quadratic Formula"). Aim for 2-4 distinct categories across the set.
- Answers should be concise but complete — ideal for the back of a flashcard. One to three sentences.
- difficulty is 1 (easy), 2 (medium), or 3 (hard). Match the requested difficulty but allow slight variation.
- UK curriculum aligned for school-age content (KS1/KS2 for primary, KS3/KS4/GCSE for secondary).
- Age-appropriate language: simple and encouraging for primary, more technical for secondary, professional for adult.
- Clear, unambiguous questions with definitive correct answers.
- No trick questions for primary age group.
- Each question must be distinct — no duplicates or near-duplicates.
- Tags should be 1-3 relevant topic keywords.
- All questions must be entirely self-contained and text-only. Do NOT reference diagrams, images, charts, graphs, tables, visual aids, or any external material. The student has nothing to look at except the question text and answer options.`;
    } else {
      systemPrompt = `You are a quiz generator for RE-VISION, a UK-based family revision app.

Generate exactly ${parsedCount} questions on the topic: "${safeTopic}"
Target age group: ${ageGroup}
Difficulty: ${difficulty}
Format: ${format}

${safeContext ? "Additional context: " + safeContext : ""}${literalRule}

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation. Just the JSON object.

Schema:
{
  "meta": {
    "topic": "${safeTopic}",
    "ageGroup": "${ageGroup}",
    "difficulty": "${difficulty}",
    "generatedAt": "ISO date string"
  },
  "questions": [
    {
      "id": "gen-001",
      "category": "${safeTopic}",
      "question": "The question text",
      "answer": "The correct answer — concise but complete",
      "difficulty": 1,
      "tags": ["relevant", "tags"],
      "format": "multiple_choice" or "free_text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctOption": "B"
    }
  ]
}

Rules:
- For multiple_choice: always exactly 4 options labelled A-D, one correct. Include "options" and "correctOption" fields.
- For free_text: omit "options" and "correctOption" fields.
- For mix: alternate between multiple_choice and free_text.
- difficulty is 1 (easy), 2 (medium), or 3 (hard). Match the requested difficulty but allow slight variation.
- UK curriculum aligned for school-age content (KS1/KS2 for primary, KS3/KS4/GCSE for secondary).
- Age-appropriate language: simple and encouraging for primary, more technical for secondary, professional for adult.
- Clear, unambiguous questions with definitive correct answers.
- No trick questions for primary age group.
- Each question must be distinct — no duplicates or near-duplicates.
- Tags should be 1-3 relevant topic keywords.
- All questions must be entirely self-contained and text-only. Do NOT reference diagrams, images, charts, graphs, tables, visual aids, or any external material. The student has nothing to look at except the question text and answer options.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate the questions now. Return only JSON.`
        }
      ]
    });

    let responseText = message.content[0].text;
    responseText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();

    let generatedData;
    try {
      generatedData = JSON.parse(responseText);
    } catch (parseError) {
      const retryMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.5,
        system: systemPrompt + "\n\nIMPORTANT: Previous attempt failed to parse. Return ONLY valid JSON, no text before or after.",
        messages: [
          {
            role: 'user',
            content: `Generate the questions now. Return only JSON, nothing else.`
          }
        ]
      });

      responseText = retryMessage.content[0].text;
      responseText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();
      generatedData = JSON.parse(responseText);
    }

    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    generatedData.questions = generatedData.questions.map((q, index) => ({
      ...q,
      id: `gen-${Date.now()}-${index + 1}`,
      difficulty: q.difficulty || difficultyMap[difficulty] || 2
    }));

    // Cache to SQLite
    setCache(cacheKey, { topic: safeTopic, ageGroup, difficulty, count: parsedCount, format }, generatedData);

    res.json({
      success: true,
      cached: false,
      ...generatedData
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: 'Failed to generate questions',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      code: 'API_ERROR',
      userMessage: 'Something went wrong. Try again?'
    });
  }
});

router.post('/mark', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-your-key-here') {
      return res.status(400).json({
        error: 'API key not configured',
        code: 'NO_API_KEY',
        userMessage: 'Ask Dad to set up the API key 😄'
      });
    }

    if (!checkRateLimit(req.user?.profileId)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        userMessage: 'Too many requests. Please wait a few minutes and try again.'
      });
    }

    const { question, correctAnswer, studentAnswer, ageGroup, literalLanguage } = req.body;

    if (!question || !correctAnswer || !studentAnswer || !ageGroup) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_REQUEST'
      });
    }

    if (!VALID_AGE_GROUPS.has(ageGroup)) {
      return res.status(400).json({ error: 'Invalid ageGroup', code: 'INVALID_REQUEST' });
    }

    // Cap lengths before any content enters a prompt
    const safeQuestion = cap(question, MAX_QUESTION_LEN);
    const safeCorrectAnswer = cap(correctAnswer, MAX_ANSWER_LEN);
    const safeStudentAnswer = cap(studentAnswer, MAX_ANSWER_LEN);

    const anthropic = getAnthropicClient();

    const markLiteralRule = literalLanguage
      ? '\nUse clear, direct language only. Do not use idioms, metaphors, sarcasm, or figurative speech in feedback and encouragement.\n'
      : '';

    // Instructions only in system prompt — no user-supplied content here
    const systemPrompt = `You are a friendly, encouraging teacher marking a student's answer in a family revision app called RE-VISION.
Student age group: ${ageGroup}
${markLiteralRule}
You will receive the question, correct answer, and student's answer. Mark the student's answer and return ONLY valid JSON. No markdown, no code fences, no explanation.

{
  "score": 0-100,
  "isCorrect": true/false,
  "feedback": "What the student got right and what they missed",
  "keyPointsMissed": ["point 1", "point 2"],
  "encouragement": "A brief encouraging message"
}

Marking rules:
- Award partial credit generously for partially correct answers.
- For primary age: very warm and encouraging, simple language, celebrate what they got right first. Use phrases like "Great try!" and "You're so close!"
- For secondary age: balanced tone, more detail on what was missed, constructive. "Good answer, but you could strengthen it by..."
- For adult: direct and technical, focus on precision and completeness. Professional tone.
- A student who demonstrates understanding of the core concept but uses imprecise language should score 60-80.
- A student who gets the gist but misses key details should score 40-60.
- Empty or completely wrong answers should score 0-20 but still get encouragement.
- Perfect or near-perfect answers score 90-100.`;

    // User-supplied content goes in the user turn, not the system prompt
    const userContent = `Question: ${safeQuestion}
Correct answer: ${safeCorrectAnswer}
Student's answer: ${safeStudentAnswer}

Mark this answer now. Return only JSON.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent
        }
      ]
    });

    let responseText = message.content[0].text;
    responseText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();

    let markingResult;
    try {
      markingResult = JSON.parse(responseText);
    } catch (parseError) {
      const retryMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        temperature: 0.3,
        system: systemPrompt + "\n\nPrevious attempt failed to parse. Return ONLY valid JSON, no text before or after.",
        messages: [{ role: 'user', content: userContent + '\n\nReturn only JSON, nothing else.' }]
      });

      responseText = retryMessage.content[0].text;
      responseText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();
      markingResult = JSON.parse(responseText);
    }

    res.json({
      success: true,
      ...markingResult
    });
  } catch (error) {
    console.error('Marking error:', error);
    res.status(500).json({
      error: 'Failed to mark answer',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      code: 'API_ERROR',
      userMessage: 'Something went wrong. Try again?'
    });
  }
});

router.get('/generated', (req, res) => {
  try {
    res.json(getCacheIndex());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch generated tests' });
  }
});

router.get('/generated/:cacheKey', (req, res) => {
  try {
    const { cacheKey } = req.params;
    const data = getCached(cacheKey);
    if (!data) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json({
      success: true,
      cached: true,
      ...data
    });
  } catch (error) {
    res.status(404).json({ error: 'Test not found' });
  }
});

router.post('/report', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-your-key-here') {
      return res.status(400).json({ error: 'API key not configured', code: 'NO_API_KEY' });
    }

    if (!checkRateLimit(req.user?.profileId)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        userMessage: 'Too many requests. Please wait a few minutes and try again.'
      });
    }

    const { profileId, testData, answers, literalLanguage } = req.body;

    if (!profileId || !testData || !answers) {
      return res.status(400).json({ error: 'Missing required fields', code: 'INVALID_REQUEST' });
    }

    // Profile access check
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Guard against empty/invalid answers
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Answers array is empty', code: 'INVALID_REQUEST' });
    }

    const rawAgeGroup = testData.meta?.ageGroup || 'adult';
    const ageGroup = VALID_AGE_GROUPS.has(rawAgeGroup) ? rawAgeGroup : 'adult';
    const topic = cap(testData.meta?.topic || 'General', MAX_TOPIC_LEN);
    const totalScore = answers.length > 0 ? Math.round(answers.reduce((sum, a) => sum + (a?.score || 0), 0) / answers.length) : 0;

    // Fetch existing learning profile for context
    const learningProfile = getLearningProfile(profileId);

    // Build question-by-question breakdown — this goes in the user turn, not the system prompt,
    // because it contains client-supplied content (keyPointsMissed from the /mark response)
    const breakdown = testData.questions.map((q, i) => {
      const a = answers[i];
      if (!a) return `Q${i + 1}: "${cap(q.question, MAX_QUESTION_LEN)}" | Skipped`;
      const missedPoints = Array.isArray(a.keyPointsMissed)
        ? a.keyPointsMissed.map(p => cap(String(p), 200)).join(', ')
        : '';
      return `Q${i + 1}: "${cap(q.question, MAX_QUESTION_LEN)}" | Score: ${a.score}% | Correct: ${a.isCorrect}${missedPoints ? ` | Missed: ${missedPoints}` : ''}`;
    }).join('\n');

    const existingWeakAreas = learningProfile.weakAreas.length > 0
      ? `\nThis student has previously struggled with: ${learningProfile.weakAreas.map(w => cap(w.area, 100)).join(', ')}`
      : '';

    let ageRules;
    if (ageGroup === 'primary') {
      ageRules = 'Use simple, encouraging language. Maximum 3 study plan items. Be very positive and supportive.';
    } else if (ageGroup === 'secondary') {
      ageRules = 'Use balanced, constructive language with moderate detail. Up to 5 study plan items.';
    } else {
      ageRules = 'Use technical, professional language. Be direct and specific. Up to 5 study plan items.';
    }

    const reportLiteralRule = literalLanguage
      ? 'Use clear, direct language only. Do not use idioms, metaphors, sarcasm, or figurative speech in the report, encouragement, and suggestions.\n'
      : '';

    // Instructions and trusted metadata in system prompt; per-question data (which includes
    // client-supplied keyPointsMissed values) goes in the user turn
    const systemPrompt = `You are a study advisor for RE-VISION, a UK-based family revision app.
Analyse the test performance data in the user message and generate a structured study report.

Topic: ${topic}
Age group: ${ageGroup}
Overall score: ${totalScore}%
${existingWeakAreas}

${ageRules}
${reportLiteralRule}

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation.

{
  "summary": "2-3 sentence performance overview",
  "strengths": ["area 1", "area 2"],
  "weakAreas": [
    { "area": "topic area", "reason": "why they struggled", "suggestion": "what to study" }
  ],
  "studyPlan": [
    { "priority": 1, "topic": "...", "action": "specific action", "timeEstimate": "15 mins" }
  ],
  "encouragement": "age-appropriate motivational message"
}`;

    const anthropic = getAnthropicClient();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      temperature: 0.4,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Question breakdown:\n${breakdown}\n\nGenerate the study report now. Return only JSON.` }]
    });

    let responseText = message.content[0].text;
    responseText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();

    let reportData;
    try {
      reportData = JSON.parse(responseText);
    } catch {
      // Retry at lower temperature before giving up
      const retryMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        temperature: 0.2,
        system: systemPrompt + "\n\nPrevious attempt failed to parse. Return ONLY valid JSON, no text before or after.",
        messages: [{ role: 'user', content: `Question breakdown:\n${breakdown}\n\nGenerate the study report now. Return only JSON, nothing else.` }]
      });
      responseText = retryMessage.content[0].text;
      responseText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();
      try {
        reportData = JSON.parse(responseText);
      } catch {
        // Both attempts failed — use a minimal fallback so the session and all rewards
        // are still saved rather than losing the user's entire test
        reportData = {
          summary: `You completed this ${topic} test and scored ${totalScore}%.`,
          strengths: [],
          weakAreas: [],
          studyPlan: [],
          encouragement: totalScore >= 70 ? 'Well done on completing the test!' : "Keep practising — you'll improve!"
        };
      }
    }

    // Save test session
    const sessionId = `session-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    saveTestSession(sessionId, profileId, testData, answers, totalScore);

    // Save report
    const reportId = `report-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    saveTestReport(reportId, sessionId, profileId, reportData);

    // Update learning profile
    updateLearningProfile(profileId, reportData, topic);

    // Gamification: award test completion bonus
    const xpResult = awardXP(profileId, 50);
    awardCoins(profileId, 20, 'test-completion');
    const newAchievements = checkAndUnlockAchievements(profileId);

    // Token system: calculate and award tokens based on test performance
    const difficulty = testData.meta?.difficulty || 'medium';
    const format = testData.meta?.format || 'mix';
    const testKey = `${topic}-${difficulty}-${format}`.toLowerCase();
    const tokenCalc = calculateTokenReward(profileId, totalScore, difficulty, testKey);
    let tokenNewBalance = null;
    if (tokenCalc.amount > 0) {
      tokenNewBalance = awardTokens(profileId, tokenCalc.amount, tokenCalc.reason, sessionId);
    }
    recordTestCompletion(profileId, testKey, totalScore);

    // Quest progress: test completion + score + session + subject
    let questCompleted = [];
    try {
      questCompleted.push(...incrementQuestProgress(profileId, 'tests_completed', 1));
      questCompleted.push(...incrementQuestProgress(profileId, 'sessions_completed', 1));
      if (totalScore >= 80) {
        questCompleted.push(...incrementQuestProgress(profileId, 'score_above_80', 1));
      }
      questCompleted.push(...incrementQuestProgress(profileId, 'subjects_studied', 1));
      updateQuestSessionDate(profileId);
      for (const quest of questCompleted) {
        if (quest.xpReward > 0) xpResult = awardXP(profileId, quest.xpReward);
        if (quest.coinReward > 0) awardCoins(profileId, quest.coinReward, `quest-complete-${quest.questId}`);
      }
    } catch { /* quest system non-critical */ }

    res.json({
      success: true, report: reportData, sessionId,
      gamification: {
        xp: xpResult, newAchievements, questCompleted,
        tokenReward: { amount: tokenCalc.amount, reason: tokenCalc.reason, newBalance: tokenNewBalance }
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      code: 'API_ERROR',
      userMessage: 'Something went wrong generating the report. Try again?'
    });
  }
});

router.get('/reports/:profileId', (req, res) => {
  try {
    const { profileId } = req.params;
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const reports = getReportsForProfile(profileId, limit);
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/learning-profile/:profileId', (req, res) => {
  try {
    const { profileId } = req.params;
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const profile = getLearningProfile(profileId);
    res.json({ success: true, ...profile });
  } catch (error) {
    console.error('Fetch learning profile error:', error);
    res.status(500).json({ error: 'Failed to fetch learning profile' });
  }
});

export default router;
