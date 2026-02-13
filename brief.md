# RE-VISION — Project Brief

## Overview
RE-VISION is a locally-hosted flashcard and dynamic test platform for a family. It serves three audiences:
- **Dad** — studying for Microsoft PL-300 Power BI certification
- **Secondary school age kids** — GCSE/KS3 revision
- **Primary school age kids** — KS1/KS2 learning

The app runs on the home network so any device in the house can access it via browser.

---

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: Express.js
- **Data**: JSON files on disk (no database)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514) for dynamic test generation and auto-marking
- **Runtime**: Node.js (already installed)

---

## Phase 1 — Build This First
> Goal: Local server serving flashcards from JSON question banks. No Claude API yet.

### Project Structure
```
re-vision/
├── client/                     # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlashcardDeck.jsx      # Flip cards, self-assessment
│   │   │   ├── ConfigPanel.jsx        # Theme/category/difficulty selector
│   │   │   ├── ResultsScreen.jsx      # Score, category breakdown, missed cards
│   │   │   ├── ProfileSelector.jsx    # Who's studying? (name picker on launch)
│   │   │   └── Navbar.jsx             # Navigation between modes
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Landing — pick profile, then mode
│   │   │   ├── Flashcards.jsx         # Flashcard study mode
│   │   │   ├── DynamicTest.jsx        # Claude-powered (Phase 2 placeholder)
│   │   │   └── Results.jsx            # Post-session results
│   │   ├── hooks/
│   │   │   └── useQuestions.js         # Fetch and filter questions from API
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                  # Tailwind imports
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js                 # Proxy /api to Express in dev
├── server/
│   ├── index.js                       # Express server entry point
│   ├── routes/
│   │   ├── questions.js               # GET /api/questions, GET /api/subjects
│   │   └── claude.js                  # POST /api/generate, POST /api/mark (Phase 2)
│   └── middleware/
│       └── errorHandler.js
├── data/
│   ├── subjects.json                  # Master index of all subjects/themes/categories
│   ├── profiles.json                  # User profiles
│   └── questions/
│       ├── power-bi-semantic-models.json
│       ├── power-bi-dax-calculations.json
│       └── README.md                  # How to add new question files
├── .env.example                       # Template for API key
├── .gitignore
├── package.json                       # Root — scripts to run both client + server
└── README.md
```

### Data Schemas

#### subjects.json
```json
{
  "subjects": [
    {
      "id": "power-bi",
      "name": "Power BI PL-300",
      "icon": "📊",
      "description": "Microsoft Power BI Data Analyst Certification",
      "ageGroup": "adult",
      "themes": [
        {
          "id": "semantic-model-setup",
          "name": "Semantic Model Setup",
          "color": "from-blue-500 to-cyan-500",
          "questionFile": "power-bi-semantic-models.json"
        },
        {
          "id": "dax-calculations",
          "name": "DAX Calculations",
          "color": "from-purple-500 to-pink-500",
          "questionFile": "power-bi-dax-calculations.json"
        }
      ]
    }
  ]
}
```

#### Question file schema (e.g. power-bi-semantic-models.json)
```json
{
  "meta": {
    "subject": "power-bi",
    "theme": "semantic-model-setup",
    "version": 1,
    "lastUpdated": "2025-02-13"
  },
  "categories": {
    "Relationships": {
      "color": "#8b5cf6",
      "bgClass": "bg-purple-500",
      "lightClass": "bg-purple-50",
      "borderClass": "border-purple-300",
      "textClass": "text-purple-700"
    }
  },
  "questions": [
    {
      "id": "sms-001",
      "category": "Relationships",
      "question": "What do relationships control in a semantic model?",
      "answer": "How tables filter one another — they are core to correct, intuitive visuals.",
      "difficulty": 1,
      "tags": ["basics"]
    }
  ]
}
```

#### profiles.json
```json
{
  "profiles": [
    {
      "id": "dad",
      "name": "Dad",
      "icon": "👨‍💻",
      "defaultSubjects": ["power-bi"],
      "ageGroup": "adult"
    },
    {
      "id": "child1",
      "name": "Child 1",
      "icon": "📚",
      "defaultSubjects": [],
      "ageGroup": "secondary"
    },
    {
      "id": "child2",
      "name": "Child 2",
      "icon": "🎒",
      "defaultSubjects": [],
      "ageGroup": "primary"
    }
  ]
}
```

### API Endpoints (Express)

#### Phase 1
- `GET /api/subjects` — returns subjects.json
- `GET /api/subjects/:subjectId/questions` — returns merged questions from all theme files for a subject
- `GET /api/subjects/:subjectId/questions?theme=dax-calculations` — filter by theme
- `GET /api/profiles` — returns profiles.json

#### Phase 2 (placeholder routes, return 501 for now)
- `POST /api/generate` — generate questions via Claude
- `POST /api/mark` — auto-mark free-text answers via Claude

### Frontend Features (Phase 1)

#### Profile Selection (Home)
- Grid of profile cards with icons
- Click to select, stores in React state (no auth needed)
- Shows subjects relevant to that profile's age group

#### Flashcard Mode
- Configuration panel: select themes → categories → difficulty
- Card flip animation (CSS 3D transform)
- Self-assessment buttons: Got it / Missed / Skip
- Keyboard shortcuts: Space=flip, 1=correct, 2=missed, 3=skip
- Progress bar
- Session results with category breakdown and missed card review

#### Design System
- Dark theme (slate-900 gradient background)
- Category colours defined per question file
- ADHD-friendly: chunked content, colour coding, minimal clutter
- Responsive: works on phone, tablet, laptop
- Font: system-ui / Segoe UI stack

### Scripts (package.json)
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "client": "cd client && npm run dev",
    "server": "cd server && node --watch index.js",
    "build": "cd client && npm run build",
    "start": "node server/index.js"
  }
}
```

In production mode, Express serves the built React app from `client/dist/`.

### Vite Config
Proxy `/api` requests to Express during development:
```js
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

Express runs on port 3001. Vite dev server runs on port 5173.
In production, Express serves everything on port 3001.

### Network Access
Express should bind to `0.0.0.0` (not localhost) so other devices on the home network can access it. Add a startup message showing the local network URL:
```
🧠 RE-VISION running at:
   Local:   http://localhost:3001
   Network: http://192.168.x.x:3001
```

---

## Phase 2 — Claude API Integration (Build After Phase 1 Works)

### Dynamic Test Generation
- User selects: topic (free text or from subjects), difficulty, question count, format (multiple choice / free text / mix)
- Frontend sends to `POST /api/generate`
- Express adds API key from `.env` and calls Claude
- Claude system prompt instructs it to return structured JSON matching our question schema
- Response cached as a JSON file in `data/questions/generated/` for reuse
- Cost estimate shown before generating (~$0.01-0.03 per 10 questions)

### Auto-Marking
- Student submits free-text answer
- Frontend sends to `POST /api/mark` with: question, correct answer, student answer, age group
- Claude evaluates and returns: score (0-100), feedback, key points missed
- Age-appropriate feedback tone (encouraging for primary, more detailed for secondary)

### Claude API Prompt Templates

#### Generation prompt
```
You are a quiz generator for a UK-based family revision app called RE-VISION.

Generate exactly {count} questions on the topic: "{topic}"
Target age group: {ageGroup}
Difficulty: {difficulty}
Format: {format}

Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "id": "gen-001",
      "category": "{topic}",
      "question": "...",
      "answer": "...",
      "options": ["A", "B", "C", "D"],  // only for multiple_choice
      "correctOption": "B",              // only for multiple_choice
      "difficulty": 1-3,
      "tags": []
    }
  ]
}

Rules:
- UK curriculum aligned for school-age content
- Age-appropriate language and complexity
- Clear, unambiguous questions
- Concise but complete answers
- For multiple choice: exactly 4 options, one correct
- No trick questions for primary age
```

#### Marking prompt
```
You are a friendly teacher marking a student's answer.

Question: {question}
Correct answer: {correctAnswer}
Student's answer: {studentAnswer}
Student age group: {ageGroup}

Return ONLY valid JSON:
{
  "score": 0-100,
  "isCorrect": true/false,
  "feedback": "...",
  "keyPointsMissed": ["...", "..."],
  "encouragement": "..."
}

Rules:
- Be encouraging, especially for younger students
- Give partial credit for partially correct answers
- Explain what was missed clearly
- Use age-appropriate language
- For primary: very encouraging, simple explanations
- For secondary: balanced, more detailed feedback
- For adult: direct, technical where appropriate
```

### .env.example
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
```

---

## Phase 3 — Future Enhancements (Don't Build Yet)
- Spaced repetition tracking (per profile, which cards are weak)
- Export results as PDF
- Subject marketplace (share question packs as JSON files)
- Timer mode for exam practice
- Progress dashboard over time
- Multiple themes (light/dark/high contrast)

---

## Existing Question Data

The following questions should be migrated into the JSON question files. There are 87 questions total across 2 themes.

### power-bi-semantic-models.json — Questions

**Categories and their colours:**
| Category | Color | Bg Class | Light Class | Border Class | Text Class |
|---|---|---|---|---|---|
| Relationships | #8b5cf6 | bg-purple-500 | bg-purple-50 | border-purple-300 | text-purple-700 |
| Storage Mode | #3b82f6 | bg-blue-500 | bg-blue-50 | border-blue-300 | text-blue-700 |
| Tables | #22c55e | bg-green-500 | bg-green-50 | border-green-300 | text-green-700 |
| Data Types | #06b6d4 | bg-cyan-500 | bg-cyan-50 | border-cyan-300 | text-cyan-700 |
| Columns | #2563eb | bg-blue-600 | bg-blue-50 | border-blue-300 | text-blue-700 |
| Hierarchies | #6366f1 | bg-indigo-500 | bg-indigo-50 | border-indigo-300 | text-indigo-700 |
| Measures | #8b5cf6 | bg-violet-500 | bg-violet-50 | border-violet-300 | text-violet-700 |
| Parameters | #eab308 | bg-yellow-500 | bg-yellow-50 | border-yellow-300 | text-yellow-700 |
| Security | #ef4444 | bg-red-500 | bg-red-50 | border-red-300 | text-red-700 |
| Model Cleanliness | #10b981 | bg-emerald-500 | bg-emerald-50 | border-emerald-300 | text-emerald-700 |
| Performance | #14b8a6 | bg-teal-500 | bg-teal-50 | border-teal-300 | text-teal-700 |

**Questions:**

| ID | Category | Question | Answer | Diff | Tags |
|---|---|---|---|---|---|
| sms-001 | Relationships | What do relationships control in a semantic model? | How tables filter one another — they are core to correct, intuitive visuals. | 1 | basics |
| sms-002 | Relationships | What is a disconnected table? | A table with no relationship to others. Perfect for What-If parameters (sliders, options). | 2 | disconnected, what-if |
| sms-003 | Relationships | What are the requirements for a relationship between two tables? | Same data type, matching/overlapping values, and acts like a Primary Key → Foreign Key link. | 1 | requirements |
| sms-004 | Relationships | Name the four cardinality types. | 1↔1, 1↔Many (most common), Many↔1, Many↔Many (use sparingly). | 2 | cardinality |
| sms-005 | Relationships | Which cardinality type is most common? | One-to-Many (1↔Many). | 1 | cardinality |
| sms-006 | Relationships | What is the rule about active relationships between tables? | Only ONE active relationship path can exist between any two tables. | 2 | active, inactive |
| sms-007 | Relationships | How do you use an inactive relationship in DAX? | Use the USERELATIONSHIP() function to activate it within a measure. | 2 | inactive, dax |
| sms-008 | Relationships | What are role-playing dimensions? Give an example. | When a table has multiple columns that could relate to the same dimension (e.g. OrderDate + ShipDate both linking to a Date table). Only one can be active; duplicate Date tables solve this. | 3 | role-playing, dates |
| sms-009 | Relationships | What is the recommended relationship direction and why? | Single direction — best for performance and clarity. Bi-directional should be used rarely as it can cause ambiguity. | 2 | direction |
| sms-010 | Relationships | When might you use a bi-directional relationship? | Rarely — only when needed for specific filtering scenarios. It can cause ambiguity and performance issues. | 2 | bi-directional |
| sms-011 | Storage Mode | What are the three storage modes? | Import (data in memory), DirectQuery (queries source directly), and Dual (acts as both). | 1 | basics |
| sms-012 | Storage Mode | Which storage mode gives the fastest performance? | Import — data is stored in memory for fastest query performance. | 1 | import |
| sms-013 | Storage Mode | What is DirectQuery and when would you use it? | Data is NOT stored locally — queries go directly to the source system. Use when data must be real-time or datasets are too large for import. | 2 | directquery |
| sms-014 | Storage Mode | What is Dual storage mode? | A table that acts as BOTH Import and DirectQuery. Used in composite models / star schemas for optimal performance. | 3 | dual |
| sms-015 | Storage Mode | What is a Composite Model? | A model that mixes Import and DirectQuery tables together — a big modern BI capability. | 2 | composite |
| sms-016 | Tables | Name 3 places you can configure tables in Power BI. | The Ribbon, the Data Pane, and Model View (best for bulk edits). | 1 | configuration |
| sms-017 | Tables | What should you ALWAYS do with Auto Date/Time? | Turn it OFF. Then create your own Date table and mark it as a Date Table. | 2 | dates |
| sms-018 | Tables | Why should you disable Auto Date/Time? | It creates hidden auto-generated date tables for every date column, bloating the model. A custom Date table is cleaner and more controllable. | 2 | dates, performance |
| sms-019 | Tables | After creating a custom Date table, what must you do? | Mark it as a Date Table in the table properties. | 1 | dates |
| sms-020 | Data Types | Why do data types matter in a semantic model? | Incorrect types break relationships, and impact performance and compression. | 1 | basics |
| sms-021 | Data Types | Name 5 common data types in Power BI. | Whole Number, Decimal, Date/Time, Text, Boolean. | 1 | basics |
| sms-022 | Columns | What is the naming rule for columns? | Column names must be unique within their table. Use clear, meaningful names. | 1 | naming |
| sms-023 | Columns | Month names sort alphabetically. How do you fix this? | Add a Month Number column, then set Sort by Column on the month name column to sort by the number column. | 2 | sort-by-column |
| sms-024 | Columns | What are Data Categories and when are they required? | Metadata that describes column content. Required for Maps (Lat/Long). Useful categories include Image URL, Web URL, and Address. | 2 | data-categories |
| sms-025 | Columns | What should you set as the default summarisation for ID columns? | Don't Summarise — IDs should never be summed, averaged, etc. | 2 | summarisation |
| sms-026 | Columns | Name 4 default summarisation options. | Sum, Average, Min, Max (plus Don't Summarise and Count). | 1 | summarisation |
| sms-027 | Hierarchies | What is the purpose of hierarchies? | Cleaner drill-down paths and better user experience in visuals. | 1 | basics |
| sms-028 | Hierarchies | Give an example of a common hierarchy. | Year → Quarter → Month (date hierarchy). | 1 | example |
| sms-029 | Measures | What are measures in DAX? | Calculated values that compute at query time — they are NOT stored in columns. | 1 | basics |
| sms-030 | Measures | What are Quick Measures? | Auto-generated DAX templates that help you create common measures without writing DAX manually. | 1 | quick-measures |
| sms-031 | Measures | Name 4 properties you can set on a measure. | Description, Synonyms, Display Folders, and Hidden/Visible. | 2 | properties |
| sms-032 | Parameters | What is the purpose of parameters? | Let users dynamically adjust report behaviour at runtime. | 1 | basics |
| sms-033 | Parameters | What does a Numeric Range Parameter create? | A calculation table with Min/Max/Increment/Default values. Great for What-If analysis (e.g. tax rate slider). | 2 | numeric |
| sms-034 | Parameters | What do Fields Parameters allow users to do? | Choose fields dynamically — changing the Axis, Metrics, or Categories displayed in visuals. | 2 | fields |
| sms-035 | Security | What does Row-Level Security (RLS) do? | Restricts which ROWS are visible to specific users. Can use static roles or dynamic roles (using USERNAME()). | 2 | rls |
| sms-036 | Security | What is Column-Level Security (CLS)? | Hides sensitive COLUMNS from certain users. Less common than RLS but very useful for protecting sensitive data. | 2 | cls |
| sms-037 | Security | What is the difference between static and dynamic RLS? | Static: hardcoded filter values in roles. Dynamic: uses USERNAME() or USERPRINCIPALNAME() to filter automatically based on who's logged in. | 3 | rls, dynamic |
| sms-038 | Model Cleanliness | Name 4 best practices for model cleanliness. | Hide unnecessary columns, use Display Folders, consistent naming conventions, and optionally place measures in a dedicated Measures table. | 1 | best-practices |
| sms-039 | Performance | What does 'Assume Referential Integrity' do? | Available in DirectQuery — improves performance by using INNER JOINs instead of OUTER JOINs, when you're confident source data is clean. | 3 | referential-integrity |
| sms-040 | Performance | What is a Star Schema and why is it preferred? | Fact tables in the middle, dimension tables around the outside. Gives clean relationships, fewer issues, and better performance. | 2 | star-schema |

### power-bi-dax-calculations.json — Questions

**Categories and their colours:**
| Category | Color | Bg Class | Light Class | Border Class | Text Class |
|---|---|---|---|---|---|
| DAX Overview | #7c3aed | bg-violet-600 | bg-violet-50 | border-violet-300 | text-violet-700 |
| Calculated Tables | #d946ef | bg-fuchsia-500 | bg-fuchsia-50 | border-fuchsia-300 | text-fuchsia-700 |
| Calculated Columns | #f97316 | bg-orange-500 | bg-orange-50 | border-orange-300 | text-orange-700 |
| Implicit Measures | #f59e0b | bg-amber-500 | bg-amber-50 | border-amber-300 | text-amber-700 |
| Explicit Measures | #f43f5e | bg-rose-500 | bg-rose-50 | border-rose-300 | text-rose-700 |
| Iterator Functions | #0ea5e9 | bg-sky-500 | bg-sky-50 | border-sky-300 | text-sky-700 |
| CALCULATE Function | #dc2626 | bg-red-600 | bg-red-50 | border-red-300 | text-red-700 |
| Filter Modifiers | #ec4899 | bg-pink-500 | bg-pink-50 | border-pink-300 | text-pink-700 |
| Filter Context | #4f46e5 | bg-indigo-600 | bg-indigo-50 | border-indigo-300 | text-indigo-700 |
| Context Transition | #059669 | bg-emerald-600 | bg-emerald-50 | border-emerald-300 | text-emerald-700 |

**Questions:**

| ID | Category | Question | Answer | Diff | Tags |
|---|---|---|---|---|---|
| dax-001 | DAX Overview | What are the 3 DAX calculation types that complete a model design? | Calculated tables, calculated columns, and measures. | 1 | basics |
| dax-002 | Calculated Tables | Why would you duplicate a table using DAX? | To handle multiple relationships between tables — e.g. creating a separate Ship Date table from a Date table so both OrderDate and ShipDate can have active relationships. | 2 | duplicate |
| dax-003 | Calculated Tables | What is the DAX formula to duplicate a Date table as a Ship Date table? | Ship Date = 'Date' — this creates a new table replicating the original that refreshes at the same time. | 2 | duplicate, syntax |
| dax-004 | Calculated Tables | What should you do after duplicating a table? | Rename the columns so they better describe their purpose in the new table (e.g. 'Ship Year', 'Ship Month'). | 1 | best-practice |
| dax-005 | Calculated Tables | What is a downside of calculated tables? | They increase model storage size and can prolong data refresh times. | 2 | performance |
| dax-006 | Calculated Tables | What is a date table required for? | Special time filters known as time intelligence functions. | 2 | dates |
| dax-007 | Calculated Tables | What does the CALENDARAUTO() function do? | Scans all date/datetime columns in the model to find the earliest and latest dates, then generates a complete set of dates spanning that entire range. Returns a single column of dates. | 2 | calendarauto |
| dax-008 | Calculated Tables | How do you specify a financial year end month in CALENDARAUTO()? | Pass a number 1–12 as an argument, e.g. CALENDARAUTO(6) for a June year-end. | 2 | calendarauto |
| dax-009 | Calculated Tables | What is the difference between CALENDARAUTO() and CALENDAR()? | CALENDARAUTO scans the model to determine date range automatically. CALENDAR requires you to specify a start and end date explicitly. | 2 | calendar |
| dax-010 | Calculated Tables | After creating a calculated date table, what must you do? | Mark it as a Date Table — this is required to enable time intelligence functions. | 1 | dates |
| dax-011 | Calculated Columns | When should you normally add custom columns — in Power Query or DAX? | Power Query is preferred. DAX calculated columns are for specific cases where Power Query can't do the job. | 1 | best-practice |
| dax-012 | Calculated Columns | Name 3 scenarios where a DAX calculated column is recommended over Power Query. | 1) Adding columns to a calculated table, 2) when the formula depends on summarised model data, 3) when specialised DAX modelling functions are needed that aren't available in Power Query M. | 3 | when-to-use |
| dax-013 | Calculated Columns | What does a calculated column return? | A single value per row — it's like an additional calculation applied to every row in the table. | 1 | basics |
| dax-014 | Calculated Columns | What context do calculated columns work with? | Row context — they evaluate the formula for each row individually. | 2 | row-context |
| dax-015 | Calculated Columns | How do you access data from a related table in a calculated column? | Use the RELATED() function (requires an existing relationship between the tables). | 2 | related |
| dax-016 | Calculated Columns | If there's no relationship, what function can you use instead of RELATED()? | LOOKUPVALUE() — but if a key exists between the tables, it's more efficient to create a relationship and use RELATED() instead, because Power BI stores and indexes data more effectively with relationships. | 3 | lookupvalue |
| dax-017 | Calculated Columns | What is the performance impact of calculated columns? | They increase storage size and prolong data refresh times, since the value must be calculated and stored for every row. | 2 | performance |
| dax-018 | Implicit Measures | What are implicit measures? | The default summarisations on a column (e.g. Sum, Average). Shown with a sigma (Σ) symbol in the Data pane for numeric columns. | 1 | basics |
| dax-019 | Implicit Measures | What does the sigma (Σ) symbol mean in the Data pane? | The column is numeric and its values will be summarised (e.g. summed) by default when added to a visual. | 1 | sigma |
| dax-020 | Implicit Measures | Name 2 drawbacks of implicit measures. | 1) Report authors can change the summarisation, potentially creating misleading visuals. 2) They only work for simple scenarios and cannot handle complex calculations. | 2 | drawbacks |
| dax-021 | Explicit Measures | How do you create an explicit measure? | Click 'New Measure' in the ribbon, then write a DAX formula that returns a single value. | 1 | creating |
| dax-022 | Explicit Measures | When are explicit measures evaluated? | At query time — they summarise model data on the fly and must return a single value. | 2 | query-time |
| dax-023 | Explicit Measures | What is a simple measure and how does it differ from an implicit measure? | A simple measure aggregates values of a single column (e.g. SUM of Sales) just like implicit, but the report author CANNOT alter the summarisation method — it's locked in. | 2 | simple |
| dax-024 | Explicit Measures | What is a compound measure? Give an example. | A measure that references other measures. E.g. Profit = [Revenue] - [Cost]. This is preferable to a calculated column because it reduces model size and refresh times. | 2 | compound |
| dax-025 | Explicit Measures | Why are compound measures preferable to calculated columns for something like Profit? | A calculated column computes row-by-row and stores every value. A compound measure only calculates where required at query time, resulting in a smaller model and shorter refresh times. | 3 | compound, performance |
| dax-026 | Explicit Measures | What are Quick Measures in the context of DAX? | A visual tool in Power BI that auto-generates DAX expressions for common calculations — you configure them through a UI rather than writing DAX manually. | 1 | quick-measures |
| dax-027 | Explicit Measures | Give 4 examples of simple measures. | Total Sales (SUM), Yearly Profit, Total Costs, Average Turnover (AVERAGE), Maximum Order Value (MAX). | 1 | examples |
| dax-028 | Iterator Functions | What do iterator functions do? | Evaluate an expression for EACH ROW in a table, then aggregate the results. Used when simple column totals aren't sufficient. | 2 | basics |
| dax-029 | Iterator Functions | When would you use an iterator function instead of a simple aggregate? | When column totals aren't sufficient — e.g. row-by-row assessments like ranking, or correctly calculating weighted averages where you need per-row multiplication before summing. | 3 | when-to-use |
| dax-030 | Iterator Functions | Give 2 use cases for iterator functions. | 1) Ranking values across rows. 2) Correctly calculating averages or totals that require a per-row calculation first (e.g. Qty × Price per row, then SUM). | 2 | use-cases |
| dax-031 | CALCULATE Function | What does the CALCULATE function do? | Modifies the filter context in which an expression is evaluated. It takes an expression that returns a value, plus optional filter arguments. | 1 | basics |
| dax-032 | CALCULATE Function | What is the syntax of CALCULATE? | CALCULATE(<expression>, [<filter1>], [<filter2>], …) — the expression is essentially a measure, followed by zero or more filter arguments. | 1 | syntax |
| dax-033 | CALCULATE Function | What are the two types of filter expressions you can pass to CALCULATE? | 1) Boolean expression filters — reference a single column, evaluate TRUE/FALSE. 2) Table expression filters — accept a table object or expression (e.g. using FILTER function). | 2 | filter-types |
| dax-034 | CALCULATE Function | What are 3 restrictions on Boolean expression filters in CALCULATE? | They can only reference columns from a single table, they cannot reference measures, and they cannot use a nested CALCULATE function. | 3 | boolean-filter, restrictions |
| dax-035 | CALCULATE Function | When a CALCULATE filter targets a column NOT already filtered, what happens? | CALCULATE adds its filter ON TOP of the existing context. Both the existing filters and the new filter apply together. | 2 | filter-behaviour |
| dax-036 | CALCULATE Function | When a CALCULATE filter targets a column that IS already filtered (e.g. by a slicer), what happens? | CALCULATE OVERWRITES the existing filter on that same column entirely. The slicer/existing filter is replaced, not combined. | 2 | filter-behaviour, overwrite |
| dax-037 | CALCULATE Function | What are the two standard outcomes when filter expressions are added to CALCULATE? (Critical exam concept) | 1) Column NOT already filtered → new filter is ADDED alongside existing context. 2) Column IS already filtered → existing filter is OVERWRITTEN (replaced) by the CALCULATE filter. | 3 | filter-behaviour, exam |
| dax-038 | CALCULATE Function | What is the difference between CALCULATE and CALCULATETABLE? | CALCULATE modifies filter context for an expression returning a scalar (single value). CALCULATETABLE does the same but for an expression returning a table object. | 2 | calculatetable |
| dax-039 | CALCULATE Function | When multiple filter arguments are passed to CALCULATE, how are they combined? | They are evaluated using AND logic — all conditions must be TRUE at the same time. | 2 | multiple-filters |
| dax-040 | CALCULATE Function | Why is using a Boolean expression filter preferred over a FILTER table expression in CALCULATE? | Boolean expressions are more efficient because Import model tables are in-memory column stores optimised to filter columns this way. FILTER should only be used when necessary (e.g. when referencing measures). | 3 | performance, best-practice |
| dax-041 | CALCULATE Function | When MUST you use the FILTER function as a table expression instead of a Boolean filter? | When the filter needs to evaluate a measure (measures cannot be referenced in Boolean expressions), or when you need complex column comparisons across tables. | 3 | filter-function, when-to-use |
| dax-042 | Filter Modifiers | What does REMOVEFILTERS do? | Removes filters from the filter context. Can target specific columns, a whole table, or all filters. It can only clear filters, NOT return a table. | 2 | removefilters |
| dax-043 | Filter Modifiers | In the Revenue % Total Group pattern, how is REMOVEFILTERS used? | REMOVEFILTERS is passed to CALCULATE to strip Region and Country filters, so the [Revenue] measure calculates a group total. The current region revenue is then divided by this total using DIVIDE. | 3 | removefilters, pattern |
| dax-044 | Filter Modifiers | What does KEEPFILTERS do? | Preserves existing filters in the filter context instead of overwriting them. It makes CALCULATE behave as AND (intersection) rather than replacing the existing filter on the same column. | 2 | keepfilters |
| dax-045 | Filter Modifiers | By default, CALCULATE overwrites filters on the same column. How does KEEPFILTERS change this? | KEEPFILTERS intersects the new filter with the existing one. Both the slicer/existing filter AND the CALCULATE filter must be satisfied — effectively an AND condition. | 3 | keepfilters, overwrite |
| dax-046 | Filter Modifiers | What does USERELATIONSHIP do when passed to CALCULATE? | Activates an inactive model relationship for the duration of that calculation. Used to leverage role-playing dimensions (e.g. using ShipDate instead of OrderDate). | 2 | userelationship |
| dax-047 | Filter Modifiers | What does CROSSFILTER do when passed to CALCULATE? | Modifies relationship filter direction during evaluation — can change from single to both direction, from both to single, or even disable a relationship entirely. It's an advanced capability. | 3 | crossfilter |
| dax-048 | Filter Modifiers | What is the relationship between ALL and REMOVEFILTERS? | ALL and its variants can behave as both filter modifiers AND functions that return table objects. If REMOVEFILTERS is supported by your tool, it's better to use REMOVEFILTERS to remove filters (clearer intent). | 3 | all, removefilters |
| dax-049 | Filter Context | What does the VALUES function do? | Returns the distinct unique values that exist within the current filter context for a column or table. Similar to UNIQUE in Excel. | 2 | values |
| dax-050 | Filter Context | VALUES always returns a table. How do you test if it contains a single value? | Use HASONEVALUE (returns TRUE when filtered to one value) or SELECTEDVALUE (returns the single value, or BLANK/alternate if multiple values exist). | 2 | hasonevalue, selectedvalue |
| dax-051 | Filter Context | What does HASONEVALUE return? | TRUE when the passed-in column has been filtered down to exactly one value in the current filter context. FALSE otherwise. | 2 | hasonevalue |
| dax-052 | Filter Context | What does SELECTEDVALUE return? | The single filtered value if exactly one exists, or BLANK (or an alternate value you specify) when multiple values are in filter context. | 2 | selectedvalue |
| dax-053 | Filter Context | What does ISFILTERED return? | TRUE when a passed-in column reference is DIRECTLY filtered (a filter has been applied to that specific column). | 2 | isfiltered |
| dax-054 | Filter Context | What does ISCROSSFILTERED return? | TRUE when a column is INDIRECTLY filtered — meaning a filter applied to another column in the same or a related table affects it through relationships. | 2 | iscrossfiltered |
| dax-055 | Filter Context | What is the difference between ISFILTERED and ISCROSSFILTERED? | ISFILTERED = direct filter on that exact column. ISCROSSFILTERED = indirect filter via another column in the same table or a related table propagating through relationships. | 3 | isfiltered, iscrossfiltered |
| dax-056 | Filter Context | What does ISINSCOPE return? | TRUE when a passed-in column is the level in a hierarchy of levels. Used to determine if a value is at a specific drill-down level (e.g. show % only at Region level, not at Total). | 3 | isinscope, hierarchy |
| dax-057 | Filter Context | Why might a Sales Commission measure return BLANK at the Total level when using HASONEVALUE? | At the Total level, multiple countries are in filter context, so HASONEVALUE returns FALSE. The IF condition fails, and Revenue is multiplied by BLANK (which returns BLANK). An iterator function is needed to solve this. | 3 | hasonevalue, totals, pattern |
| dax-058 | Context Transition | What is context transition? | The process of converting row context into filter context. This happens when CALCULATE is used within a row context (calculated column or iterator function). | 2 | basics |
| dax-059 | Context Transition | What does CALCULATE do when used WITHOUT any filter arguments? | It transitions row context to filter context. This is required when a non-measure expression that summarises data needs to be evaluated in row context. | 3 | no-filters |
| dax-060 | Context Transition | Consider: CustomerRevenue = SUM(Sales[Sales Amount]) in a calculated column. Why does this return only one value for every row? | SUM evaluates in filter context and sums ALL sales, not per-customer. There's no row-level evaluation — it returns the grand total for every row. | 3 | problem-scenario |
| dax-061 | Context Transition | How do you fix a calculated column that returns a grand total instead of per-row values? | Wrap the aggregation in CALCULATE — e.g. CALCULATE(SUM(Sales[Sales Amount])). CALCULATE transitions the row context to filter context, evaluating the SUM for the current row only. | 3 | fix, calculate-wrap |
| dax-062 | Context Transition | When is context transition automatic (no explicit CALCULATE needed)? | When a model MEASURE is referenced in row context — measures automatically trigger context transition. Only non-measure expressions (like SUM) need an explicit CALCULATE wrapper. | 3 | automatic |
| dax-063 | Context Transition | If you reference an existing measure like [Total Revenue] in a calculated column, do you need CALCULATE? | No — measures already evaluate in filter context and automatically trigger context transition when used in row context. | 3 | automatic, measures |
| dax-064 | Context Transition | How can context transition principles help avoid HASONEVALUE patterns at total levels? | By using table-level iterator functions with measures that already transition context automatically. The iterator evaluates per row, and the measure handles the context — providing both detail and totals without HASONEVALUE checks. | 3 | iterators, totals, advanced |

---

## Instructions for Claude Code

1. **Build Phase 1 only.** Do not implement Claude API integration yet — just set up placeholder routes that return 501.
2. **Migrate all 87 questions** into the two JSON files exactly as specified above.
3. **Test that `npm run dev` works** — both Express and Vite should start, and the flashcard UI should load with questions from the API.
4. **Bind Express to 0.0.0.0** so it's accessible from other devices on the network.
5. **Keep the UI style** consistent with what we've already built: dark theme, colour-coded categories, flip animation, keyboard shortcuts, ADHD-friendly design.
6. After Phase 1 is working, we'll move to Phase 2 (Claude API integration).
