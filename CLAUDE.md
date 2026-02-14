# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RE-VISION is a locally-hosted flashcard and dynamic test platform for a family studying for certifications and school exams. The app runs on the home network and serves three user profiles with different age groups (adult, secondary, primary).

## Tech Stack

- **Frontend**: React 18 + Vite, React Router, Tailwind CSS
- **Backend**: Express.js (ES modules)
- **Data Storage**: SQLite via better-sqlite3 (single file: `data/revision.db`)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514) for dynamic test generation and auto-marking
- **Runtime**: Node.js

## Development Commands

### Initial Setup
```bash
npm run install-all  # Install dependencies for root, client, and server
```

### Development
```bash
npm run dev          # Run both client and server concurrently
npm run client       # Run client only (Vite dev server on port 5173)
npm run server       # Run server only (Express with --watch on port 3001)
```

### Production
```bash
npm run build        # Build client for production (outputs to client/dist)
npm start            # Start production server (serves static build)
npm run migrate      # Run JSON-to-SQLite migration (one-time)
npm run prod:start   # Start with PM2 (production)
npm run prod:stop    # Stop PM2 process
npm run prod:restart # Restart PM2 process
npm run prod:logs    # View PM2 logs
```

### Environment Setup
- Copy `.env.example` to `.env` and add your Anthropic API key
- The `.env` file is located in the project root, not in the server directory
- Server loads it via `dotenv.config({ path: path.join(process.cwd(), '..', '.env') })`

## Architecture

### Monorepo Structure
```
re-vision/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── dashboard/     # Dashboard-specific components
│   │   ├── pages/             # Route-level pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── context/           # React context providers
│   │   └── App.jsx
├── server/                    # Express backend
│   ├── db/                    # Database layer
│   │   ├── index.js           # SQLite singleton (WAL mode, schema init)
│   │   ├── schema.sql         # Table definitions
│   │   └── migrate-json.js    # One-time JSON→SQLite migration
│   ├── dal/                   # Data access layer
│   │   ├── subjects.js        # Subjects, themes, questions, categories
│   │   ├── profiles.js        # User profiles
│   │   ├── progress.js        # Card progress, history, stats
│   │   └── cache.js           # Generated question cache
│   ├── routes/                # API route handlers
│   ├── utils/                 # Utility functions (SM-2, streaks)
│   └── middleware/            # Express middleware
├── scripts/                   # Deployment scripts
│   ├── pi-setup.sh            # One-time Pi setup
│   └── deploy.sh              # Pull + build + restart
├── data/                      # Data directory
│   ├── revision.db            # SQLite database (gitignored)
│   ├── questions/             # Original JSON files (backup)
│   ├── progress/              # Original JSON files (backup)
│   ├── subjects.json          # Original (backup, used by migration)
│   └── profiles.json          # Original (backup, used by migration)
├── ecosystem.config.cjs       # PM2 configuration
└── package.json               # Root workspace with scripts
```

### Client-Server Communication
- **Development**: Vite dev server (port 5173) proxies `/api/*` requests to Express (port 3001)
- **Production**: Express serves the built React app from `client/dist` and handles API routes
- Server binds to `0.0.0.0` to allow access from other devices on the network

### Data Architecture

All data is stored in SQLite (`data/revision.db`) with these tables:
- **subjects** → **themes** → **questions** (with **categories** for styling)
- **profiles** (user accounts)
- **card_progress** + **card_history** + **profile_stats** (learning data)
- **generated_cache** (AI-generated question cache)

The DAL layer (`server/dal/`) provides functions that return JSON shapes matching the original API responses, so the frontend requires zero changes.

### Database Schema (key tables)

See `server/db/schema.sql` for full schema. Key tables:
- `questions`: id, subject_id, theme_id, category, question, answer, difficulty, tags (JSON), format, options (JSON), correct_option
- `card_progress`: profile_id, card_id, last_seen, next_due, interval, ease_factor, repetitions
- `card_history`: profile_id, card_id, date, result (correct/incorrect/skipped)
- `generated_cache`: cache_key, topic, age_group, difficulty, count, format, generated_at, data (JSON)

### Migration

Original JSON files are preserved in `data/` as backup. To re-migrate:
1. Delete `data/revision.db`
2. Run `npm run migrate`

## API Endpoints

### Questions API (`server/routes/questions.js`)
- `GET /api/subjects` - Returns all subjects with themes
- `GET /api/subjects/:subjectId/questions` - Returns questions for a subject
- `GET /api/subjects/:subjectId/questions?theme=:themeId` - Filter by theme
- `GET /api/profiles` - Returns user profiles
- `POST /api/generate/save` - Save AI-generated questions to the question bank

### Claude API (`server/routes/claude.js`)
- `GET /api/health` - Returns server status and whether Claude API key is configured
- `POST /api/generate` - Generate questions using Claude API (with caching)
  - Supports formats: `multiple_choice`, `free_text`, `mix`, `flashcard`
- `POST /api/mark` - Auto-mark free-text answers using Claude API

### Progress API (`server/routes/progress.js`)
- `GET /api/progress/:profileId` - Get progress data for a profile
- `POST /api/progress/:profileId/record` - Record a card review session
- `GET /api/progress/:profileId/due` - Get cards due for review (spaced repetition)
- `GET /api/progress/:profileId/stats` - Get learning statistics and analytics

### Generated Question Caching
- Generated questions are cached in the `generated_cache` SQLite table
- Cache keys are MD5 hashes of request parameters (topic, ageGroup, difficulty, count, format)
- Same request parameters return cached version without hitting API

## Frontend Patterns

### User Flow
1. **Home** → Select profile (sets age group and theme preference)
2. **Mode Selection** → Choose from:
   - Flashcards (traditional study mode)
   - Dynamic Test (AI-generated tests)
   - Smart Review (spaced repetition)
   - Dashboard (progress analytics)
3. **Configuration** → Select subject/theme or generate new questions
4. **Study/Test** → Interactive learning experience with timer option
5. **Results** → Review performance, export to PDF, save generated questions

### State Management
- Profile state managed in `App.jsx` and passed to pages
- Theme managed via `ThemeContext` (dark/light/high contrast)
- Progress tracked per profile in `data/progress/:profileId.json`
- No global state library - uses React Context and props
- Session results passed via React Router navigation state

### Styling Conventions
- **Themes**: Configurable via CSS variables
  - Dark theme (default): `from-slate-900 to-slate-800`
  - Light theme: `from-slate-50 to-slate-100`
  - High contrast: Enhanced visibility
- Category colors defined in question files, applied via Tailwind classes
- ADHD-friendly design: chunked content, color coding, minimal clutter
- Responsive breakpoints handled by Tailwind

## Phase-Based Implementation

The project is built in phases (see `brief.md` and `PHASE2.md`):

### Phase 1 (Complete)
- Flashcard mode with self-assessment
- JSON question bank
- Profile selection
- Basic UI with dark theme

### Phase 2 (Complete)
- Claude API integration for dynamic test generation
- Auto-marking for free-text answers
- Question caching to minimize API costs
- Save generated questions to main bank
- Flashcard generation wizard

### Phase 3 (Complete)
- **Spaced repetition tracking** using SM-2 algorithm
- **Progress dashboard** with analytics and charts
- **Export to PDF** for progress reports
- **Timer mode** for timed exam practice
- **Smart Review** page using spaced repetition
- **Theme switching** (dark, light, high contrast)
- **Streak tracking** and statistics
- **Import/Export** functionality for question banks

## Important Conventions

### File Organization
- **Components**: Reusable UI elements
  - Core: `FlashcardDeck`, `ConfigPanel`, `Navbar`, `ProfileSelector`
  - Dashboard: `StatsCards`, `AccuracyChart`, `CategoryStrength`, `WeakestCards`, `Heatmap`
  - Features: `ExportPDF`, `ImportExport`, `Timer`, `ThemeSwitcher`, `ColorPresets`
  - Wizards: `FlashcardGenerationWizard`, `TestConfig`, `TestQuestion`, `TestResults`
- **Pages**: Route-level components
  - `Home`, `Flashcards`, `DynamicTest`, `Results`, `Dashboard`, `SmartReview`
- **Hooks**: Custom React hooks
  - `useQuestions` - Fetch and filter questions
  - `useProgress` - Track learning progress
  - `useTimer` - Exam timer functionality
- **Context**: React context providers
  - `ThemeContext` - Theme switching (dark/light/high contrast)
- **Routes**: Express route handlers (thin controllers)
  - `questions.js` - Question bank operations
  - `claude.js` - AI generation and marking
  - `progress.js` - Progress tracking and spaced repetition
- **DAL**: Data access layer (all DB operations)
  - `subjects.js` - Subjects, themes, questions, categories, import/export
  - `profiles.js` - User profiles
  - `progress.js` - Card progress, history, stats, due cards
  - `cache.js` - Generated question cache
- **DB**: Database setup
  - `index.js` - SQLite singleton with WAL mode
  - `schema.sql` - Table definitions
  - `migrate-json.js` - One-time JSON→SQLite migration
- **Utils**: Server-side utilities (pure logic, no DB calls)
  - `spacedRepetition.js` - SM-2 algorithm implementation
  - `streaks.js` - Streak and statistics tracking
- **Middleware**: Express middleware (`errorHandler.js`)

### Error Handling
- Server uses centralized error handler middleware
- Frontend displays user-friendly messages (not raw API errors)
- Age-appropriate error messages for different profiles

### Age Group Context
Three age groups determine content difficulty and feedback tone:
- **primary**: Simple language, very encouraging (KS1/KS2)
- **secondary**: Balanced tone, more detail (KS3/KS4/GCSE)
- **adult**: Technical, professional (certifications)

### Claude API Usage
- Model: `claude-sonnet-4-20250514`
- System prompts emphasize returning **only** valid JSON (no markdown, no code fences)
- Prompts are age-group aware
- Supports multiple formats: `multiple_choice`, `free_text`, `mix`, `flashcard`
- Rate limiting: 20 API calls per hour (in-memory counter, resets on restart)
- Caching: Generated questions cached by hash of request parameters

### Spaced Repetition System
- **Algorithm**: Simplified SM-2 (SuperMemo 2)
- **Storage**: Per-profile JSON files in `data/progress/:profileId.json`
- **Card Data**: Tracks interval, ease factor, repetitions, last seen, next due date
- **Review Outcomes**: correct, incorrect, skipped
- **Smart Review**: Surfaces cards due for review based on spaced repetition scheduling

### Progress Tracking
Progress is stored in SQLite across three tables:
- **card_progress**: Per-card spaced repetition data (interval, ease factor, next due)
- **card_history**: Individual review records (enables SQL aggregation for dashboard)
- **profile_stats**: Aggregate statistics (sessions, streaks, last session date)

The DAL reconstructs the same JSON shape the frontend expects.

### Theme System
Themes are managed via CSS variables and React Context:
- **dark**: Slate gradient (default)
- **light**: Light slate gradient
- **high-contrast**: Enhanced visibility for accessibility
- Theme preference stored per profile
- Applied via `data-theme` attribute on document root

## Common Development Tasks

### Adding a New Subject
Subjects are now stored in SQLite. To add one:
1. Use the app's import feature, or
2. Use the `/api/generate/save` endpoint to save AI-generated questions, or
3. Add to the JSON files and re-run `npm run migrate` (delete `data/revision.db` first)

### Adding New API Routes
1. Create route handler in `server/routes/`
2. Import and use in `server/index.js` via `app.use('/api', routeName)`
3. Add error handling via `next(error)` for async errors

### Adding New Pages
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.jsx`
3. Update Navbar if needed

### Testing Changes
- Changes to server code auto-reload via `--watch` flag
- Changes to client code hot-reload via Vite HMR
- Test on multiple devices by accessing the Network URL shown on startup
- Verify API key is valid via `GET /api/health`

## Key Files Reference

### Documentation
- `brief.md` - Original project specification (Phase 1)
- `PHASE2.md` - Claude API integration specification (Phase 2)
- `CLAUDE.md` - This file - guidance for future development

### Backend Core
- `server/index.js` - Express app setup, health check, DB initialization
- `server/db/index.js` - SQLite singleton (WAL mode, schema init)
- `server/db/schema.sql` - Database table definitions
- `server/db/migrate-json.js` - One-time JSON→SQLite migration script
- `server/dal/subjects.js` - Data access: subjects, themes, questions, import/export
- `server/dal/profiles.js` - Data access: user profiles
- `server/dal/progress.js` - Data access: card progress, history, stats, due cards
- `server/dal/cache.js` - Data access: generated question cache
- `server/routes/claude.js` - AI-powered question generation and marking
- `server/routes/questions.js` - Question bank API routes (delegates to DAL)
- `server/routes/progress.js` - Progress tracking API routes (delegates to DAL)
- `server/utils/spacedRepetition.js` - SM-2 algorithm for review scheduling
- `server/utils/streaks.js` - Statistics and streak tracking

### Frontend Core
- `client/src/App.jsx` - React Router setup, profile and theme state
- `client/src/context/ThemeContext.jsx` - Theme provider (dark/light/high contrast)
- `client/src/pages/Dashboard.jsx` - Progress analytics and charts
- `client/src/pages/SmartReview.jsx` - Spaced repetition study mode
- `client/src/hooks/useProgress.js` - Progress tracking hook
- `client/vite.config.js` - API proxy configuration

### Data Files
- `data/revision.db` - SQLite database (all app data, gitignored)
- `data/subjects.json` - Original JSON (backup, used by migration)
- `data/profiles.json` - Original JSON (backup, used by migration)
- `data/progress/` - Original progress JSON (backup)
- `data/questions/` - Original question JSON files (backup)

### Deployment
- `ecosystem.config.cjs` - PM2 process manager configuration
- `scripts/pi-setup.sh` - One-time Raspberry Pi setup
- `scripts/deploy.sh` - Pull, build, and restart on Pi

## Network Configuration

Express binds to `0.0.0.0:3001` to allow access from:
- Local development: `http://localhost:3001`
- Network devices: `http://192.168.x.x:3001`

Network URLs are displayed on server startup using Node's `os.networkInterfaces()`.
