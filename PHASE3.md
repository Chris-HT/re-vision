# RE-VISION — Phase 3: Spaced Repetition, Progress Dashboard & Polish

Phases 1 and 2 are complete. The app serves flashcards from JSON question banks and generates dynamic tests via the Claude API. Now we add the features that make this a daily-use revision tool for the whole family.

---

## Priority Order

Build in this order — each feature is independently useful:
1. **Spaced Repetition Engine** (highest value)
2. **Progress Dashboard**
3. **Exam Timer Mode**
4. **Export Results as PDF**
5. **Theme Switcher** (light/dark/high-contrast)
6. **Profile Enhancements** (welcome back, last session, favourites)
7. **Subject Sharing** (export/import question packs)

---

## 1. Spaced Repetition Engine

### Concept
Track per-profile, per-card performance over time. Cards the user gets wrong resurface sooner. Cards they consistently nail get pushed further out. This is based on a simplified SM-2 / Leitner system.

### Data Schema

Create `data/progress/{profileId}.json` per profile:
```json
{
  "profileId": "dad",
  "cards": {
    "sms-001": {
      "lastSeen": "2025-02-13T14:30:00Z",
      "nextDue": "2025-02-15T14:30:00Z",
      "interval": 2,
      "easeFactor": 2.5,
      "repetitions": 3,
      "history": [
        { "date": "2025-02-13T14:30:00Z", "result": "correct" },
        { "date": "2025-02-12T10:00:00Z", "result": "correct" },
        { "date": "2025-02-11T09:00:00Z", "result": "incorrect" }
      ]
    },
    "dax-031": {
      "lastSeen": "2025-02-13T14:32:00Z",
      "nextDue": "2025-02-14T14:32:00Z",
      "interval": 1,
      "easeFactor": 1.8,
      "repetitions": 1,
      "history": [
        { "date": "2025-02-13T14:32:00Z", "result": "incorrect" }
      ]
    }
  },
  "stats": {
    "totalSessions": 15,
    "totalCardsStudied": 342,
    "currentStreak": 3,
    "longestStreak": 7,
    "lastSessionDate": "2025-02-13T14:30:00Z"
  }
}
```

### SM-2 Algorithm (simplified)

When a card is answered:

```javascript
function updateCard(card, result) {
  const now = new Date().toISOString();
  
  // result: "correct" | "incorrect" | "skipped"
  if (result === "correct") {
    card.repetitions += 1;
    if (card.repetitions === 1) {
      card.interval = 1;        // 1 day
    } else if (card.repetitions === 2) {
      card.interval = 3;        // 3 days
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.easeFactor = Math.max(1.3, card.easeFactor + 0.1);
  } else if (result === "incorrect") {
    card.repetitions = 0;
    card.interval = 1;          // reset to 1 day
    card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
  }
  // "skipped" — don't change interval or ease, just record it
  
  card.lastSeen = now;
  card.nextDue = addDays(now, card.interval);
  card.history.unshift({ date: now, result });
  
  // Cap history at last 20 entries to keep file size manageable
  if (card.history.length > 20) card.history = card.history.slice(0, 20);
  
  return card;
}
```

### API Endpoints

#### GET /api/progress/:profileId
Returns the full progress file for a profile. Creates an empty one if it doesn't exist.

#### PUT /api/progress/:profileId/card/:cardId
Update a single card's progress after the user answers it.

**Request body:**
```json
{
  "result": "correct"
}
```

**Response:**
```json
{
  "success": true,
  "card": { ...updatedCardData },
  "stats": { ...updatedStats }
}
```

#### GET /api/progress/:profileId/due?themes=semantic-model-setup,dax-calculations&limit=30
Returns cards that are due for review (nextDue <= now), sorted by most overdue first. Also includes unseen cards. The `themes` and `limit` params are optional filters.

**Response:**
```json
{
  "dueCards": ["sms-001", "dax-031", "sms-008"],
  "unseenCards": ["dax-055", "dax-056"],
  "totalDue": 12,
  "totalUnseen": 8
}
```

#### GET /api/progress/:profileId/stats
Returns summary statistics for the dashboard.

### Frontend: Smart Study Mode

Add a new study mode alongside the existing Flashcard mode: **"Smart Review"**

- Accessed from the home page as a new card: "🧠 Smart Review — AI-powered spaced repetition"
- Automatically selects cards that are due for review + unseen cards
- Prioritises: overdue cards first → due today → unseen cards
- After each card answer, sends the result to PUT /api/progress/:profileId/card/:cardId
- Shows a mini-stats bar: "🔥 3 day streak • 12 cards due • 8 new"
- When all due cards are done: "You're all caught up! 🎉 Come back tomorrow." with option to study unseen cards or do extra practice

### Frontend: Integration with Existing Flashcards

The existing flashcard mode should ALSO record progress (so Smart Review knows which cards have been seen):
- After each card answer in normal flashcard mode, fire the same PUT /api/progress endpoint
- This means even casual flashcard sessions feed into the spaced repetition data

### Streak Tracking

Update the `stats` object on each session:
- `lastSessionDate`: set to today
- `currentStreak`: increment if last session was yesterday, reset to 1 if gap > 1 day, keep if same day
- `longestStreak`: update if currentStreak exceeds it
- `totalSessions`: increment per session (a session = studying at least 1 card)
- `totalCardsStudied`: increment per card answered

---

## 2. Progress Dashboard

### New Page: /dashboard

Accessible from the Navbar. Shows per-profile learning analytics.

### Dashboard Sections

#### Header Stats (top row, 4 cards)
- 🔥 Current Streak: "{n} days"
- 📚 Cards Studied: total all-time
- 🎯 Accuracy: overall % correct
- ⏰ Due Today: count of cards due

#### Accuracy Over Time (line chart)
- X axis: last 14 days (or last 30 if enough data)
- Y axis: % correct per day
- Use Recharts `<LineChart>` with a gradient fill
- Only show days where at least 1 card was studied

#### Category Strength (horizontal bar chart)
- Each category with its colour
- Bar shows % correct (all-time for that category)
- Sorted weakest → strongest
- Shows card count per category

#### Weakest Cards (table/list)
- Top 10 cards with lowest easeFactor or most incorrect answers
- Show: question preview (truncated), category, times missed, last seen
- Click to expand and see the full question + answer
- "Practice These" button → starts a flashcard session with just these cards

#### Study Activity Heatmap
- GitHub-style contribution grid
- Last 12 weeks
- Colour intensity = number of cards studied that day
- Shows at a glance how consistent the study habit is

#### Recent Sessions (list)
- Last 5 sessions: date, cards studied, accuracy, time spent (if we track it)
- Click to see the detailed results of that session

### Data Source
All dashboard data is derived from `data/progress/{profileId}.json`. No additional storage needed — just compute the views on the fly from the card history data.

### Charts Library
Use Recharts (already likely available or easy to add):
```bash
cd client && npm install recharts
```

Components needed: LineChart, BarChart, and a custom heatmap grid (simple CSS grid with coloured cells).

---

## 3. Exam Timer Mode

### Concept
A timed test mode for exam simulation. Available in both Flashcard and Dynamic Test modes.

### Configuration
Add to the test/flashcard config panel:
- **Timer toggle**: Off (default) | Per Question | Whole Test
- **Per Question**: 30s / 60s / 90s / 120s (dropdown)
- **Whole Test**: calculated from question count × time per question, or custom entry

### Timer UI
- Countdown displayed prominently in the top-right of the study screen
- Visual urgency: green > 50% time remaining, amber 25-50%, red < 25%, pulsing red < 10%
- Per-question timer: when it hits 0, auto-mark as "skipped" and advance to next card
- Whole-test timer: when it hits 0, end the session and show results with any unanswered cards marked as skipped

### Results Enhancement
When timer mode is used, results should also show:
- Total time taken
- Average time per question
- Fastest/slowest questions
- "Time's up" indicator on any questions that were auto-skipped

---

## 4. Export Results as PDF

### Implementation
Use `jspdf` and `jspdf-autotable` for clean PDF generation:
```bash
cd client && npm install jspdf jspdf-autotable
```

### Available On
- Flashcard results screen → "Export PDF" button
- Dynamic test results screen → "Export PDF" button
- Dashboard → "Export Progress Report" button

### PDF Content

#### Session Export (flashcards/dynamic test)
- Header: RE-VISION logo/text, profile name, date
- Summary: total questions, score %, time taken (if timer mode)
- Question table: #, Question, Correct Answer, Your Answer (for dynamic tests), Result (✓/✗), Score (for free text)
- Footer: "Generated by RE-VISION"

#### Progress Report Export (dashboard)
- Header: RE-VISION, profile name, date range
- Stats summary: streak, total cards, accuracy
- Category breakdown table: category, cards studied, accuracy %, strength rating
- Weakest areas with recommended focus
- Study consistency (sessions per week over last month)

### Design
- Clean, printer-friendly layout (no dark backgrounds)
- Category colours used as accents
- Tables with alternating row shading
- A4 format, landscape for tables if needed

---

## 5. Theme Switcher

### Themes
Three themes stored per profile in `profiles.json`:

| Theme | Background | Card BG | Text | Description |
|---|---|---|---|---|
| Dark (default) | slate-900 gradient | slate-800/80 | white | Current design |
| Light | white/gray-50 | white | gray-900 | Clean, bright, good for younger kids |
| High Contrast | black | white | black/yellow | Accessibility-focused |

### Implementation
- Add `theme` field to profile: `"theme": "dark"` (default)
- Create a ThemeContext provider wrapping the app
- CSS variables or Tailwind dark/light classes
- Theme selector: settings icon in the navbar → dropdown with theme options
- Changes save immediately to the profile via PUT /api/profiles/:profileId

### CSS Variables Approach
Define in `:root` and override per theme:
```css
:root {
  --bg-primary: #0f172a;
  --bg-card: rgba(30, 41, 59, 0.8);
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  --border-color: rgba(100, 116, 139, 0.5);
}

[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-card: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
}

[data-theme="high-contrast"] {
  --bg-primary: #000000;
  --bg-card: #ffffff;
  --text-primary: #000000;
  --text-secondary: #000000;
  --border-color: #ffffff;
}
```

Refactor existing components to use these variables instead of hardcoded Tailwind colour classes. Use inline styles with `var(--bg-primary)` etc.

---

## 6. Profile Enhancements

### Welcome Back Message
On the home page, after selecting a profile, show:
- "Welcome back, {name}! 👋"
- "Last session: {timeAgo} — you studied {category}"
- "You have {n} cards due for review" (links to Smart Review)
- Current streak with flame emoji: "🔥 5 day streak!"

### Favourite Subjects
- Profiles can pin subjects to their home screen
- Pinned subjects show as quick-launch cards at the top
- Add/remove via a star icon on each subject card
- Store in profile: `"favourites": ["power-bi", "year8-science"]`

### Profile API Updates
#### PUT /api/profiles/:profileId
Update profile settings (theme, favourites, name, icon).

**Request body (partial update):**
```json
{
  "theme": "light",
  "favourites": ["power-bi"]
}
```

### Profile Data Migration
Add new fields to existing profiles in `profiles.json`:
```json
{
  "id": "dad",
  "name": "Dad",
  "icon": "👨‍💻",
  "defaultSubjects": ["power-bi"],
  "ageGroup": "adult",
  "theme": "dark",
  "favourites": ["power-bi"]
}
```

---

## 7. Subject Sharing (Export/Import)

### Export
- On any subject card in the config/home screen, add a "Share" icon
- Clicking it generates a standalone `.json` file containing:
  - Subject metadata
  - All themes and categories for that subject
  - All questions
- File is downloaded to the user's device
- Filename: `re-vision-{subjectId}-{date}.json`

### Import
- "Import Subject" button on the home page
- File upload input accepting `.json`
- Validates the file structure against the question schema
- Shows a preview: "{n} questions across {n} categories in {subject name}"
- "Import" button adds to the system (creates new files in `data/`)
- Handles ID collisions by prefixing imported IDs with `imp-`

### API Endpoints

#### GET /api/subjects/:subjectId/export
Returns a complete exportable JSON bundle for a subject.

#### POST /api/subjects/import
Accepts an uploaded JSON bundle, validates it, and imports into the data directory.

---

## 8. File Changes Summary

### New Backend Files:
- `server/routes/progress.js` — all spaced repetition endpoints
- `server/utils/spacedRepetition.js` — SM-2 algorithm implementation
- `server/utils/streaks.js` — streak calculation logic

### Modified Backend Files:
- `server/index.js` — register new routes, ensure `data/progress/` exists on startup
- `server/routes/questions.js` — add export endpoint
- `server/routes/profiles.js` (or wherever profiles are handled) — add PUT for profile updates

### New Frontend Files:
- `client/src/pages/Dashboard.jsx` — progress dashboard page
- `client/src/pages/SmartReview.jsx` — spaced repetition study mode
- `client/src/components/dashboard/StatsCards.jsx` — header stat cards
- `client/src/components/dashboard/AccuracyChart.jsx` — line chart
- `client/src/components/dashboard/CategoryStrength.jsx` — horizontal bar chart
- `client/src/components/dashboard/WeakestCards.jsx` — table of weak cards
- `client/src/components/dashboard/Heatmap.jsx` — GitHub-style activity grid
- `client/src/components/dashboard/RecentSessions.jsx` — session list
- `client/src/components/Timer.jsx` — countdown timer component
- `client/src/components/ExportPDF.jsx` — PDF generation
- `client/src/components/ThemeSwitcher.jsx` — theme dropdown
- `client/src/components/ImportExport.jsx` — subject sharing UI
- `client/src/context/ThemeContext.jsx` — theme provider
- `client/src/hooks/useProgress.js` — hook for progress API calls
- `client/src/hooks/useTimer.js` — hook for countdown logic

### Modified Frontend Files:
- `client/src/pages/Home.jsx` — welcome back message, favourites, Smart Review card, import button
- `client/src/pages/Flashcards.jsx` — integrate progress tracking on each card answer, timer option
- `client/src/pages/DynamicTest.jsx` — timer option, PDF export on results
- `client/src/components/Navbar.jsx` — add Dashboard + Smart Review links, theme switcher
- `client/src/components/ResultsScreen.jsx` — add PDF export button
- All components using hardcoded colours — refactor to CSS variables for theme support

### New Data Directories/Files:
- `data/progress/` — directory for per-profile progress files
- `data/progress/dad.json` — created on first use
- `data/progress/child1.json` — created on first use
- etc.

---

## 9. New Dependencies

```bash
# Backend (root)
# (none new for Phase 3)

# Frontend
cd client
npm install recharts jspdf jspdf-autotable
```

---

## 10. Testing Checklist

### Spaced Repetition
- [ ] First time studying creates progress file for profile
- [ ] Card marked "correct" increases interval and ease factor
- [ ] Card marked "incorrect" resets interval to 1 day and decreases ease factor
- [ ] Smart Review shows due cards sorted by most overdue
- [ ] Smart Review shows unseen cards after due cards are complete
- [ ] "All caught up" message when no cards are due
- [ ] Regular flashcard mode also records progress
- [ ] Streak increments when studying on consecutive days
- [ ] Streak resets if a day is missed

### Dashboard
- [ ] Stats cards show correct totals
- [ ] Accuracy chart renders with real data
- [ ] Category strength bars match actual performance
- [ ] Weakest cards list shows genuinely weak cards
- [ ] Heatmap reflects actual study days
- [ ] "Practice These" button on weakest cards works
- [ ] Dashboard works with zero data (new profile)

### Timer
- [ ] Per-question timer counts down and auto-advances
- [ ] Whole-test timer ends session when time runs out
- [ ] Visual urgency colours change at correct thresholds
- [ ] Timed-out questions marked as skipped
- [ ] Results show timing information

### PDF Export
- [ ] Session PDF generates with all questions and results
- [ ] Dashboard PDF generates with stats and charts
- [ ] PDFs are legible and well-formatted
- [ ] Works on mobile (downloads file)

### Themes
- [ ] Dark theme (default) looks like current design
- [ ] Light theme is clean and readable
- [ ] High contrast theme meets accessibility needs
- [ ] Theme persists per profile across sessions
- [ ] All components respect theme variables

### Profiles
- [ ] Welcome back message shows on home page
- [ ] Favourite subjects pin to top
- [ ] Profile settings save and persist

### Import/Export
- [ ] Export downloads valid JSON
- [ ] Import validates file structure
- [ ] Imported questions appear in flashcard mode
- [ ] ID collisions are handled

---

## Implementation Order (Recommended)

1. Spaced repetition backend (data schema, API routes, SM-2 algorithm)
2. Smart Review frontend page
3. Integrate progress tracking into existing flashcard mode
4. Progress dashboard backend (stats computation)
5. Progress dashboard frontend (all 6 sections)
6. Timer component + integration
7. PDF export
8. Theme system (context, CSS variables, refactor components)
9. Profile enhancements (welcome back, favourites, settings)
10. Subject import/export
11. End-to-end testing
12. Mobile responsiveness check across all new pages
