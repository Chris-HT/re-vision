# RE-VISION — Phase 2: Claude API Integration

Phase 1 is complete and running. Now implement Claude API integration for dynamic test generation and auto-marking.

---

## Overview

Two new capabilities:
1. **Dynamic Test Generation** — users describe a topic and Claude generates structured questions on demand
2. **Auto-Marking** — students submit free-text answers and Claude evaluates them with age-appropriate feedback

---

## Prerequisites

### .env Setup
Create `.env` in the project root (if not already present):
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
```

### Install Anthropic SDK
```bash
npm install @anthropic-ai/sdk dotenv
```

---

## 1. Backend: Claude API Routes

Replace the placeholder 501 responses in `server/routes/claude.js` with working implementations.

### POST /api/generate

**Request body:**
```json
{
  "topic": "Photosynthesis",
  "ageGroup": "primary",       // "primary" | "secondary" | "adult"
  "difficulty": "medium",      // "easy" | "medium" | "hard"
  "count": 10,                 // 5-20
  "format": "multiple_choice", // "multiple_choice" | "free_text" | "mix"
  "additionalContext": ""      // optional: "Focus on the light reactions" etc.
}
```

**Implementation:**
1. Validate request body — reject if missing required fields or count > 20
2. Generate a cache key from the request params (e.g. hash of topic+ageGroup+difficulty+count+format)
3. Check if `data/questions/generated/{cacheKey}.json` already exists — if so, return cached version
4. Call Claude API using the Anthropic SDK (model: `claude-sonnet-4-20250514`, max_tokens: 4096)
5. Parse the JSON response from Claude
6. Save to cache file in `data/questions/generated/`
7. Return the questions to the frontend

**System prompt for generation:**
```
You are a quiz generator for RE-VISION, a UK-based family revision app.

Generate exactly {count} questions on the topic: "{topic}"
Target age group: {ageGroup}
Difficulty: {difficulty}
Format: {format}

{additionalContext ? "Additional instructions: " + additionalContext : ""}

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation. Just the JSON object.

Schema:
{
  "meta": {
    "topic": "{topic}",
    "ageGroup": "{ageGroup}",
    "difficulty": "{difficulty}",
    "generatedAt": "ISO date string"
  },
  "questions": [
    {
      "id": "gen-001",
      "category": "{topic}",
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
```

**Response to frontend:**
```json
{
  "success": true,
  "cached": false,
  "questions": [ ... ],
  "meta": { ... }
}
```

### POST /api/mark

**Request body:**
```json
{
  "question": "What is photosynthesis?",
  "correctAnswer": "The process by which plants convert sunlight, water and CO2 into glucose and oxygen.",
  "studentAnswer": "Its when plants use the sun to make food",
  "ageGroup": "primary"
}
```

**Implementation:**
1. Validate request body
2. Call Claude API (model: `claude-sonnet-4-20250514`, max_tokens: 1024)
3. Parse and return the response

**System prompt for marking:**
```
You are a friendly, encouraging teacher marking a student's answer in a family revision app called RE-VISION.

Question: {question}
Correct answer: {correctAnswer}
Student's answer: {studentAnswer}
Student age group: {ageGroup}

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
- Perfect or near-perfect answers score 90-100.
```

**Response to frontend:**
```json
{
  "success": true,
  "score": 75,
  "isCorrect": false,
  "feedback": "You've got the right idea that plants use sunlight to make food! To get full marks, try to mention that plants also need water and carbon dioxide, and that they produce oxygen as well as glucose.",
  "keyPointsMissed": ["water and CO2 as inputs", "oxygen as output", "glucose specifically, not just 'food'"],
  "encouragement": "Great try! You clearly understand the basics — keep it up! 🌱"
}
```

### POST /api/generate/save

Save generated questions permanently into the main question bank (so they appear in Flashcard mode too).

**Request body:**
```json
{
  "subjectId": "year7-science",
  "themeId": "biology",
  "questions": [ ... ]
}
```

**Implementation:**
1. Load the relevant question file from `data/questions/`
2. Append new questions with proper IDs (avoid collisions)
3. Save the file back
4. If the subject/theme doesn't exist yet, create new entries in `subjects.json` and a new question file

---

## 2. Frontend: Dynamic Test Page

Build the `DynamicTest.jsx` page (currently a placeholder). This is a full test-taking experience.

### Test Configuration Panel
The user sees this first when they navigate to Dynamic Test mode.

**Fields:**
- **Topic** — free text input with placeholder "e.g. Photosynthesis, World War 2, Fractions..."
- **Additional context** — optional textarea, "e.g. Focus on the light reactions, Year 8 level..."
- **Format** — toggle buttons: Multiple Choice | Free Text | Mix
- **Number of questions** — slider or number input, 5-20, default 10
- **Difficulty** — Easy / Medium / Hard toggle (inherits from profile age group as default)

**Generate button:**
- Shows "Generating {count} questions..." with a loading spinner
- On success, transitions to the test-taking view
- On error, shows a friendly error message with retry option

**Cost indicator:**
- Small text below the generate button: "Estimated cost: ~$0.01-0.03"
- After generation, show actual token usage if available

### Test-Taking View

**For Multiple Choice questions:**
- Show the question
- Show 4 option buttons (A, B, C, D)
- Clicking an option highlights it
- "Submit Answer" button confirms the selection
- After submit: show correct/incorrect with the right answer highlighted in green, wrong in red
- Show brief explanation (from the answer field)

**For Free Text questions:**
- Show the question
- Textarea for the student to type their answer
- "Submit Answer" button
- Loading spinner while Claude marks the answer
- After marking: show score (colour coded: green >70, amber 40-70, red <40), feedback, key points missed, and encouragement
- The correct answer is shown for comparison

**Navigation:**
- Progress bar at top (question X of Y)
- "Next Question" button after each answer is submitted
- Cannot skip back (keeps it simple)

### Test Results View

After all questions are answered:
- Overall score (percentage) with colour coding
- Breakdown per question: question text, student answer, correct answer, score, feedback
- "Save Questions to Bank" button — saves the generated questions into the flashcard system for future revision using POST /api/generate/save
- "Try Again" button — re-runs the same test (resets answers but keeps questions)
- "New Test" button — goes back to configuration

### UI Design
- Match the existing dark theme and design system
- Same font stack, colour palette, rounded cards
- Free text marking feedback should use a card with:
  - Score badge (coloured circle)
  - Feedback text
  - "Points missed" as small pills/tags
  - Encouragement in italic

---

## 3. Frontend: Navigation Update

Update the Navbar/Home page to include the Dynamic Test mode:
- Add a "Dynamic Test" card/button to the home page alongside Flashcards
- Icon suggestion: 🤖 or ⚡ or 🧪
- Description: "AI-generated tests on any topic"
- If no API key is configured, show a message: "Add your Anthropic API key to .env to enable dynamic tests"

### API Key Check
Add a health check endpoint:
- `GET /api/health` — returns `{ "status": "ok", "claudeApiConfigured": true/false }`
- Frontend calls this on load and shows/hides the Dynamic Test option accordingly

---

## 4. Error Handling

### Backend
- If ANTHROPIC_API_KEY is missing: return `{ "error": "API key not configured", "code": "NO_API_KEY" }`
- If Claude API returns an error: return `{ "error": "Failed to generate questions", "details": error.message, "code": "API_ERROR" }`
- If Claude returns invalid JSON: retry once with a stricter prompt, then return error
- Rate limiting: simple in-memory counter, max 20 API calls per hour (resets on server restart)

### Frontend
- Show user-friendly error messages (not raw API errors)
- "API key not configured" → "Ask Dad to set up the API key 😄"
- "Rate limit" → "You've been busy! Try again in a bit."
- "API error" → "Something went wrong. Try again?"
- Network errors → "Can't reach the server. Is it running?"

---

## 5. Caching Strategy

Generated questions should be cached to avoid repeat API costs:

```
data/questions/generated/
├── {cacheKey}.json          # cached generated questions
└── index.json               # index of all cached generations for browsing
```

**Cache key**: lowercase, sanitized hash of `${topic}-${ageGroup}-${difficulty}-${count}-${format}`

**index.json schema:**
```json
{
  "generations": [
    {
      "cacheKey": "abc123",
      "topic": "Photosynthesis",
      "ageGroup": "primary",
      "difficulty": "medium",
      "count": 10,
      "format": "multiple_choice",
      "generatedAt": "2025-02-13T10:30:00Z"
    }
  ]
}
```

**Browsing cached tests**: On the Dynamic Test config panel, show a "Previous Tests" section that lists cached generations. Users can click to retake a previously generated test without hitting the API.

---

## 6. File Changes Summary

### New/Modified Backend Files:
- `server/routes/claude.js` — replace 501 stubs with working implementations
- `server/routes/questions.js` — add POST endpoint for saving generated questions
- `server/index.js` — add dotenv config, ensure `data/questions/generated/` directory exists on startup
- `.env` — create with API key placeholder

### New/Modified Frontend Files:
- `client/src/pages/DynamicTest.jsx` — full implementation
- `client/src/components/TestConfig.jsx` — test configuration panel
- `client/src/components/TestQuestion.jsx` — individual question display (MC + free text)
- `client/src/components/TestResults.jsx` — end-of-test results
- `client/src/components/MarkingFeedback.jsx` — feedback card for free-text marking
- `client/src/pages/Home.jsx` — add Dynamic Test option
- `client/src/components/Navbar.jsx` — add Dynamic Test nav link

### New Data Files:
- `data/questions/generated/` — directory for cached generations
- `data/questions/generated/index.json` — starts as `{ "generations": [] }`

---

## 7. Testing Checklist

After building, verify:
- [ ] `.env` with a valid API key is loaded
- [ ] `GET /api/health` returns `claudeApiConfigured: true`
- [ ] Dynamic Test option appears on home page
- [ ] Can generate 5 multiple choice questions on "Basic Fractions" for primary age
- [ ] Questions render correctly with A-D options
- [ ] Selecting and submitting shows correct/incorrect
- [ ] Can generate 5 free text questions on "Photosynthesis" for secondary age
- [ ] Submitting a free text answer shows Claude's marking feedback
- [ ] Results screen shows all questions, answers, and scores
- [ ] "Save to Bank" works — questions appear in flashcard mode after save
- [ ] Same test topic returns cached version on second request
- [ ] "Previous Tests" shows cached generations
- [ ] Errors display user-friendly messages
- [ ] Rate limiting works (20 calls/hour)
- [ ] Works from another device on the network

---

## Implementation Order

Build in this sequence:
1. Backend: `.env` setup, Anthropic SDK, health check endpoint
2. Backend: `POST /api/generate` with caching
3. Frontend: TestConfig panel + loading state
4. Frontend: TestQuestion component (multiple choice first)
5. Connect generate → display flow end-to-end and test
6. Backend: `POST /api/mark`
7. Frontend: TestQuestion component (free text + marking)
8. Frontend: TestResults page
9. Backend: `POST /api/generate/save`
10. Frontend: "Save to Bank" functionality
11. Frontend: "Previous Tests" from cache
12. Error handling and rate limiting
13. Navigation updates (Home + Navbar)
14. End-to-end testing across devices
