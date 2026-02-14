import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCard, updateCard } from '../utils/spacedRepetition.js';
import { createStats, updateStats } from '../utils/streaks.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../../data');
const progressPath = path.join(dataPath, 'progress');

/**
 * Load a profile's progress file, creating an empty one if it doesn't exist.
 */
async function loadProgress(profileId) {
  const filePath = path.join(progressPath, `${profileId}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    const empty = {
      profileId,
      cards: {},
      stats: createStats()
    };
    await fs.mkdir(progressPath, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(empty, null, 2));
    return empty;
  }
}

/**
 * Save a profile's progress file.
 */
async function saveProgress(profileId, data) {
  const filePath = path.join(progressPath, `${profileId}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// GET /api/progress/:profileId
router.get('/progress/:profileId', async (req, res, next) => {
  try {
    const progress = await loadProgress(req.params.profileId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

// PUT /api/progress/:profileId/card/:cardId
router.put('/progress/:profileId/card/:cardId', async (req, res, next) => {
  try {
    const { profileId, cardId } = req.params;
    const { result } = req.body;

    if (!['correct', 'incorrect', 'skipped'].includes(result)) {
      return res.status(400).json({ error: 'result must be "correct", "incorrect", or "skipped"' });
    }

    const progress = await loadProgress(profileId);

    // Get or create card entry
    let card = progress.cards[cardId] || createCard();
    card = updateCard(card, result);
    progress.cards[cardId] = card;

    // Check if this is a new session (first card today different from last session date)
    const today = new Date().toISOString().split('T')[0];
    const lastDate = progress.stats.lastSessionDate
      ? progress.stats.lastSessionDate.split('T')[0]
      : null;
    const isNewSession = lastDate !== today;

    progress.stats = updateStats(progress.stats, isNewSession);

    await saveProgress(profileId, progress);

    res.json({
      success: true,
      card,
      stats: progress.stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/progress/:profileId/due?themes=theme1,theme2&limit=30
router.get('/progress/:profileId/due', async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const { themes, limit } = req.query;
    const themeList = themes ? themes.split(',') : null;
    const maxCards = limit ? parseInt(limit) : 30;

    const progress = await loadProgress(profileId);

    // Load all question IDs from the question bank, filtered by themes
    const subjectsData = JSON.parse(
      await fs.readFile(path.join(dataPath, 'subjects.json'), 'utf-8')
    );

    const allQuestionIds = new Set();
    for (const subject of subjectsData.subjects) {
      for (const theme of subject.themes) {
        if (themeList && !themeList.includes(theme.id)) continue;
        try {
          const questionData = JSON.parse(
            await fs.readFile(path.join(dataPath, 'questions', theme.questionFile), 'utf-8')
          );
          questionData.questions.forEach(q => allQuestionIds.add(q.id));
        } catch {
          // Skip missing files
        }
      }
    }

    const now = new Date();
    const dueCards = [];
    const unseenCards = [];

    for (const qId of allQuestionIds) {
      const card = progress.cards[qId];
      if (!card || !card.lastSeen) {
        unseenCards.push(qId);
      } else if (new Date(card.nextDue) <= now) {
        dueCards.push({ id: qId, nextDue: card.nextDue });
      }
    }

    // Sort due cards by most overdue first
    dueCards.sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));

    const dueIds = dueCards.map(c => c.id).slice(0, maxCards);
    const unseenIds = unseenCards.slice(0, Math.max(0, maxCards - dueIds.length));

    res.json({
      dueCards: dueIds,
      unseenCards: unseenIds,
      totalDue: dueCards.length,
      totalUnseen: unseenCards.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/progress/:profileId/stats
router.get('/progress/:profileId/stats', async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const progress = await loadProgress(profileId);

    // Compute additional stats from card history
    const cards = Object.values(progress.cards);
    let totalCorrect = 0;
    let totalAnswered = 0;

    // Per-day accuracy for charts
    const dailyStats = {};
    // Per-category stats
    const categoryStats = {};

    // Load question data to map card IDs to categories
    const subjectsData = JSON.parse(
      await fs.readFile(path.join(dataPath, 'subjects.json'), 'utf-8')
    );

    const cardToCategory = {};
    const cardToQuestion = {};
    for (const subject of subjectsData.subjects) {
      for (const theme of subject.themes) {
        try {
          const questionData = JSON.parse(
            await fs.readFile(path.join(dataPath, 'questions', theme.questionFile), 'utf-8')
          );
          questionData.questions.forEach(q => {
            cardToCategory[q.id] = q.category;
            cardToQuestion[q.id] = q.question;
          });
        } catch {
          // Skip missing files
        }
      }
    }

    for (const [cardId, card] of Object.entries(progress.cards)) {
      const category = cardToCategory[cardId] || 'Unknown';

      for (const entry of card.history) {
        if (entry.result === 'skipped') continue;

        totalAnswered++;
        const isCorrect = entry.result === 'correct';
        if (isCorrect) totalCorrect++;

        // Daily stats
        const day = entry.date.split('T')[0];
        if (!dailyStats[day]) {
          dailyStats[day] = { correct: 0, total: 0 };
        }
        dailyStats[day].total++;
        if (isCorrect) dailyStats[day].correct++;

        // Category stats
        if (!categoryStats[category]) {
          categoryStats[category] = { correct: 0, total: 0, cards: new Set() };
        }
        categoryStats[category].total++;
        if (isCorrect) categoryStats[category].correct++;
        categoryStats[category].cards.add(cardId);
      }
    }

    // Convert daily stats to sorted array
    const accuracyOverTime = Object.entries(dailyStats)
      .map(([date, s]) => ({
        date,
        accuracy: Math.round((s.correct / s.total) * 100),
        total: s.total
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Convert category stats (serialize Sets to counts)
    const categoryBreakdown = Object.entries(categoryStats)
      .map(([category, s]) => ({
        category,
        correct: s.correct,
        total: s.total,
        accuracy: Math.round((s.correct / s.total) * 100),
        cardCount: s.cards.size
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    // Weakest cards: lowest ease factor or most incorrect
    const weakestCards = Object.entries(progress.cards)
      .map(([cardId, card]) => {
        const incorrectCount = card.history.filter(h => h.result === 'incorrect').length;
        return {
          cardId,
          question: cardToQuestion[cardId] || cardId,
          category: cardToCategory[cardId] || 'Unknown',
          easeFactor: card.easeFactor,
          incorrectCount,
          lastSeen: card.lastSeen
        };
      })
      .filter(c => c.incorrectCount > 0 || c.easeFactor < 2.0)
      .sort((a, b) => a.easeFactor - b.easeFactor)
      .slice(0, 10);

    // Study heatmap: last 12 weeks of daily card counts
    const heatmapData = {};
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    for (const card of cards) {
      for (const entry of card.history) {
        const day = entry.date.split('T')[0];
        if (new Date(day) >= twelveWeeksAgo) {
          heatmapData[day] = (heatmapData[day] || 0) + 1;
        }
      }
    }

    // Count due today
    const now = new Date();
    const allQuestionIds = new Set(Object.keys(cardToCategory));
    let dueToday = 0;
    for (const qId of allQuestionIds) {
      const card = progress.cards[qId];
      if (card && card.nextDue && new Date(card.nextDue) <= now) {
        dueToday++;
      }
    }

    res.json({
      ...progress.stats,
      overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      dueToday,
      accuracyOverTime,
      categoryBreakdown,
      weakestCards,
      heatmapData
    });
  } catch (error) {
    next(error);
  }
});

export default router;
