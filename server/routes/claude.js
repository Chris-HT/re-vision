import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rateLimiter = {
  calls: 0,
  resetTime: Date.now() + 3600000,
  limit: 20
};

function checkRateLimit() {
  if (Date.now() > rateLimiter.resetTime) {
    rateLimiter.calls = 0;
    rateLimiter.resetTime = Date.now() + 3600000;
  }
  
  if (rateLimiter.calls >= rateLimiter.limit) {
    return false;
  }
  
  rateLimiter.calls++;
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

    if (!checkRateLimit()) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        userMessage: "You've been busy! Try again in a bit."
      });
    }

    const { topic, ageGroup, difficulty, count, format, additionalContext } = req.body;
    
    if (!topic || !ageGroup || !difficulty || !count || !format) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        code: 'INVALID_REQUEST'
      });
    }

    if (count < 5 || count > 20) {
      return res.status(400).json({
        error: 'Count must be between 5 and 20',
        code: 'INVALID_COUNT'
      });
    }

    const cacheKey = crypto.createHash('md5')
      .update(`${topic}-${ageGroup}-${difficulty}-${count}-${format}`.toLowerCase())
      .digest('hex');
    
    const generatedDir = path.join(__dirname, '../../data/questions/generated');
    const cacheFile = path.join(generatedDir, `${cacheKey}.json`);
    
    try {
      const cached = await fs.readFile(cacheFile, 'utf-8');
      return res.json({
        success: true,
        cached: true,
        ...JSON.parse(cached)
      });
    } catch (err) {
      // Cache miss, generate new questions
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const systemPrompt = `You are a quiz generator for RE-VISION, a UK-based family revision app.

Generate exactly ${count} questions on the topic: "${topic}"
Target age group: ${ageGroup}
Difficulty: ${difficulty}
Format: ${format}

${additionalContext ? "Additional instructions: " + additionalContext : ""}

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation. Just the JSON object.

Schema:
{
  "meta": {
    "topic": "${topic}",
    "ageGroup": "${ageGroup}",
    "difficulty": "${difficulty}",
    "generatedAt": "ISO date string"
  },
  "questions": [
    {
      "id": "gen-001",
      "category": "${topic}",
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
- Tags should be 1-3 relevant topic keywords.`;

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

    await fs.writeFile(cacheFile, JSON.stringify(generatedData, null, 2));

    const indexPath = path.join(generatedDir, 'index.json');
    const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    index.generations.push({
      cacheKey,
      topic,
      ageGroup,
      difficulty,
      count,
      format,
      generatedAt: new Date().toISOString()
    });
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    res.json({
      success: true,
      cached: false,
      ...generatedData
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: 'Failed to generate questions',
      details: error.message,
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

    if (!checkRateLimit()) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        userMessage: "You've been busy! Try again in a bit."
      });
    }

    const { question, correctAnswer, studentAnswer, ageGroup } = req.body;

    if (!question || !correctAnswer || !studentAnswer || !ageGroup) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_REQUEST'
      });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const systemPrompt = `You are a friendly, encouraging teacher marking a student's answer in a family revision app called RE-VISION.

Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${studentAnswer}
Student age group: ${ageGroup}

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation.

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Mark this answer now. Return only JSON.'
        }
      ]
    });

    let responseText = message.content[0].text;
    responseText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();
    
    const markingResult = JSON.parse(responseText);

    res.json({
      success: true,
      ...markingResult
    });
  } catch (error) {
    console.error('Marking error:', error);
    res.status(500).json({
      error: 'Failed to mark answer',
      details: error.message,
      code: 'API_ERROR',
      userMessage: 'Something went wrong. Try again?'
    });
  }
});

router.get('/generated', async (req, res) => {
  try {
    const indexPath = path.join(__dirname, '../../data/questions/generated/index.json');
    const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    res.json(index);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch generated tests' });
  }
});

router.get('/generated/:cacheKey', async (req, res) => {
  try {
    const { cacheKey } = req.params;
    const filePath = path.join(__dirname, '../../data/questions/generated', `${cacheKey}.json`);
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    res.json({
      success: true,
      cached: true,
      ...data
    });
  } catch (error) {
    res.status(404).json({ error: 'Test not found' });
  }
});

export default router;