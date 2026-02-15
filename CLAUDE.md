# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RE-VISION is a locally-hosted flashcard and dynamic test platform for a family studying for certifications and school exams. The app runs on the home network (deployed to a Raspberry Pi) and serves three user profiles with different age groups (adult, secondary, primary).

**Deployment model**: Develop on any machine (Windows/Mac), push to GitHub, deploy to Pi via `scripts/deploy.sh`. The Pi runs the production build with PM2.

## Tech Stack

- **Frontend**: React 18 + Vite, React Router, Tailwind CSS
- **Backend**: Express.js (ES modules)
- **Data Storage**: SQLite via better-sqlite3 (single file: `data/revision.db`, gitignored)
- **Auth**: bcryptjs (PIN hashing), jsonwebtoken (JWT sessions)
- **AI**: Anthropic Claude API (claude-sonnet-4-5-20250929) for dynamic test generation, auto-marking, and study report generation
- **Runtime**: Node.js
- **Production**: PM2 process manager on Raspberry Pi 3 / Zero 2W
- **Remote Access**: Tailscale (optional, for access outside home network)

## Development Commands

### Initial Setup (any dev machine)
```bash
npm run install-all  # Install dependencies for root, client, and server
npm run migrate      # Import JSON data into SQLite (one-time, creates data/revision.db)
```

### Development (any dev machine)
```bash
npm run dev          # Run both client and server concurrently
npm run client       # Run client only (Vite dev server on port 5173)
npm run server       # Run server only (Express with --watch on port 3001)
```

### Production (on the Pi)
```bash
npm run build        # Build client for production (outputs to client/dist)
npm start            # Start production server (serves static build)
npm run prod:start   # Start with PM2 (production)
npm run prod:stop    # Stop PM2 process
npm run prod:restart # Restart PM2 process
npm run prod:logs    # View PM2 logs
```

### Environment Setup
- Copy `.env.example` to `.env` and add your Anthropic API key and JWT secret
- Required variables: `ANTHROPIC_API_KEY`, `JWT_SECRET` (if unset, a random secret is generated per restart)
- The `.env` file is located in the project root, not in the server directory
- Server loads it via `dotenv.config({ path: path.join(process.cwd(), '..', '.env') })`

### First-time setup on a new machine
1. Clone the repo from GitHub
2. `npm run install-all`
3. Copy or create `.env` with your `ANTHROPIC_API_KEY`
4. `npm run migrate` (imports the JSON data files into a local SQLite DB)
5. `npm run dev`

The SQLite database (`data/revision.db`) is gitignored - each machine creates its own from the JSON source files via migration. The JSON files in `data/` are the canonical seed data checked into git.

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
│   │   ├── cache.js           # Generated question cache
│   │   └── reports.js         # Test sessions, reports, learning profiles
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
- **profiles** (user accounts with PIN auth and roles)
- **parent_child** (parent-child relationships for family access)
- **card_progress** + **card_history** + **profile_stats** (learning data)
- **generated_cache** (AI-generated question cache)
- **test_sessions** + **test_reports** (dynamic test history and AI study reports)
- **learning_profiles** (cumulative per-user weak/strong area tracking)

The DAL layer (`server/dal/`) provides functions that return JSON shapes matching the original API responses, so the frontend requires zero changes.

### Database Schema (key tables)

See `server/db/schema.sql` for full schema. Key tables:
- `questions`: id, subject_id, theme_id, category, question, answer, difficulty, tags (JSON), format, options (JSON), correct_option
- `card_progress`: profile_id, card_id, last_seen, next_due, interval, ease_factor, repetitions
- `card_history`: profile_id, card_id, date, result (correct/incorrect/skipped)
- `generated_cache`: cache_key, topic, age_group, difficulty, count, format, generated_at, data (JSON)
- `test_sessions`: id, profile_id, topic, age_group, difficulty, format, question_count, score, completed_at, questions_data (JSON), answers_data (JSON)
- `test_reports`: id, session_id (unique), profile_id, report_data (JSON), generated_at
- `learning_profiles`: profile_id, weak_areas (JSON), strong_areas (JSON), topics_tested (JSON), updated_at
- `profiles` (auth columns added via ALTER): pin_hash, role (admin/parent/child)
- `parent_child`: parent_id, child_id (links parents to children)

### Migration

Original JSON files are preserved in `data/` as backup. To re-migrate:
1. Delete `data/revision.db`
2. Run `npm run migrate`

## API Endpoints

### Auth API (`server/routes/auth.js`) — unauthenticated
- `GET /api/auth/profiles` - Profile list for login screen (id, name, icon, hasPin)
- `POST /api/auth/login` - Verify PIN, return JWT + profile
- `POST /api/auth/set-pin` - First-time PIN setup (only when no PIN exists)
- `GET /api/auth/me` - Validate token, return profile + role (authenticated)
- `POST /api/auth/change-pin` - Change existing PIN (authenticated)
- `GET /api/auth/children` - Returns linked children profiles (admin/parent only)

### Questions API (`server/routes/questions.js`) — authenticated
- `GET /api/subjects` - Returns all subjects with themes
- `GET /api/subjects/:subjectId/questions` - Returns questions for a subject
- `GET /api/subjects/:subjectId/questions?theme=:themeId` - Filter by theme
- `GET /api/profiles` - Returns user profiles
- `POST /api/generate/save` - Save AI-generated questions to the question bank (admin only)

### Claude API (`server/routes/claude.js`)
- `GET /api/health` - Returns server status and whether Claude API key is configured
- `POST /api/generate` - Generate questions using Claude API (with caching)
  - Supports formats: `multiple_choice`, `free_text`, `mix`, `flashcard`
- `POST /api/mark` - Auto-mark free-text answers using Claude API
- `POST /api/report` - Generate AI study report from test results (saves session, report, and updates learning profile)
- `GET /api/reports/:profileId` - Get recent test reports for a profile (for Dashboard)
- `GET /api/learning-profile/:profileId` - Get cumulative learning profile (weak areas, strong areas, topics tested)

### Progress API (`server/routes/progress.js`)
- `GET /api/progress/:profileId` - Get progress data for a profile
- `POST /api/progress/:profileId/record` - Record a card review session
- `GET /api/progress/:profileId/due` - Get cards due for review (spaced repetition)
- `GET /api/progress/:profileId/stats` - Get learning statistics and analytics

### Generated Question Caching
- Generated questions are cached in the `generated_cache` SQLite table
- Cache keys are MD5 hashes of request parameters (topic, ageGroup, difficulty, count, format)
- Same request parameters return cached version without hitting API
- `additionalContext` (including learning profile weak areas) is intentionally excluded from the cache key

### Dynamic Test Flow
- User configures test (topic, difficulty, format, count) via `TestConfig`
- `TestConfig` fetches the user's learning profile and appends weak areas to `additionalContext` for context-aware generation
- During the test, each question shows feedback after submission (correct/incorrect highlights, marking results); user must click "Next Question" to advance (no auto-advance)
- On the last question, button reads "See Results"
- Results screen shows score breakdown and a "Generate Study Report" button (button-triggered to conserve API calls)
- Study report is generated via `POST /api/report`, which saves the test session, report, and updates the learning profile
- Reports are accessible on the Dashboard via the `TestReports` component

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
5. **Results** → Review performance, generate study report, export to PDF, save generated questions

### State Management
- Profile state managed in `App.jsx` and passed to pages
- Theme managed via `ThemeContext` (dark/light/high contrast)
- Progress tracked per profile in SQLite (card_progress + card_history tables)
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

### Phase 4 (Complete)
- **SQLite migration**: Replaced JSON file I/O with better-sqlite3 (WAL mode)
- **Data access layer**: `server/dal/` modules separate DB ops from route handlers
- **PM2 process management**: Auto-restart, memory limits, log management
- **Pi deployment scripts**: One-time setup (`scripts/pi-setup.sh`) and deploy (`scripts/deploy.sh`)
- **Tailscale**: For optional remote access outside the home network

### Phase 5 (Complete)
- **Pause-for-feedback**: Dynamic tests no longer auto-advance; after answering, feedback is shown and the user clicks "Next Question" (or "See Results" on the last question) to proceed
- **AI study reports**: On test completion, users can click "Generate Study Report" to get a Claude-generated analysis with strengths, weak areas, a prioritised study plan, and age-appropriate encouragement
- **Test session persistence**: Completed tests are saved to `test_sessions` table with full question/answer data; AI reports saved to `test_reports` table
- **Learning profiles**: Cumulative per-user tracking in `learning_profiles` table — weak areas, strong areas, and topics tested are updated after each report
- **Context-aware test generation**: When generating new tests, `TestConfig` fetches the user's learning profile and includes weak areas as `additionalContext` so Claude can target areas needing improvement
- **Dashboard test reports**: New `TestReports` component on the Dashboard shows recent test reports with expandable details (topic, score, date, full study report)

### Phase 6a (Complete)
- **PIN-based authentication**: Users set a 4-6 digit PIN on first login; JWT tokens (24h expiry) stored in `localStorage`
- **Role-based access**: Three roles — `admin` (Dad), `parent`, `child`; enforced on both frontend and backend
- **Auth middleware**: `server/middleware/auth.js` provides `authenticate`, `requireRole`, and `canAccessProfile` helpers
- **Auth wall**: All `/api/*` routes (except `/api/health` and `/api/auth/*`) require a valid JWT
- **Parent-child relationships**: `parent_child` table links parents to children; parents/admins can view children's data
- **Login rate limiting**: 5 failed PIN attempts per profile triggers a 5-minute lockout (in-memory)
- **Family Dashboard**: Admin/parent-only page at `/family` showing all children's stats and recent test reports
- **Authenticated fetch**: `client/src/utils/api.js` provides `apiFetch` wrapper that attaches JWT and handles 401 redirects
- **Admin-only restrictions**: Save to question bank (`POST /api/generate/save`) and import (`POST /api/subjects/import`) require admin role
- **Profile access control**: Progress, reports, and learning profile endpoints check that the requesting user owns the data or is a parent/admin

## Important Conventions

### File Organization
- **Components**: Reusable UI elements
  - Core: `FlashcardDeck`, `ConfigPanel`, `Navbar`, `PinInput`
  - Dashboard: `StatsCards`, `AccuracyChart`, `CategoryStrength`, `WeakestCards`, `Heatmap`, `TestReports`
  - Features: `ExportPDF`, `ImportExport`, `Timer`, `ThemeSwitcher`, `ColorPresets`, `StudyReport`
  - Wizards: `FlashcardGenerationWizard`, `TestConfig`, `TestQuestion`, `TestResults`
- **Pages**: Route-level components
  - `Login`, `Home`, `Flashcards`, `DynamicTest`, `Results`, `Dashboard`, `SmartReview`, `FamilyDashboard`
- **Hooks**: Custom React hooks
  - `useQuestions` - Fetch and filter questions
  - `useProgress` - Track learning progress
  - `useTimer` - Exam timer functionality
- **Context**: React context providers
  - `ThemeContext` - Theme switching (dark/light/high contrast)
- **Utils**: Frontend utilities
  - `api.js` - Authenticated fetch wrapper (`apiFetch`)
- **Routes**: Express route handlers (thin controllers)
  - `auth.js` - Authentication (login, PIN setup, token validation, children)
  - `questions.js` - Question bank operations
  - `claude.js` - AI generation, marking, study reports, and learning profiles
  - `progress.js` - Progress tracking and spaced repetition
- **DAL**: Data access layer (all DB operations)
  - `auth.js` - Login profiles, PIN management, parent-child queries
  - `subjects.js` - Subjects, themes, questions, categories, import/export
  - `profiles.js` - User profiles
  - `progress.js` - Card progress, history, stats, due cards
  - `cache.js` - Generated question cache
  - `reports.js` - Test sessions, test reports, learning profiles
- **DB**: Database setup
  - `index.js` - SQLite singleton with WAL mode
  - `schema.sql` - Table definitions
  - `migrate-json.js` - One-time JSON→SQLite migration
- **Utils**: Server-side utilities (pure logic, no DB calls)
  - `spacedRepetition.js` - SM-2 algorithm implementation
  - `streaks.js` - Streak and statistics tracking
- **Middleware**: Express middleware
  - `errorHandler.js` - Centralized error handler
  - `auth.js` - JWT authentication, role checking, profile access control

### Authentication & Authorization
- **Strategy**: PIN-based login with JWT tokens (24h expiry, stored in `localStorage`)
- **JWT payload**: `{ profileId, role, name }`; secret from `JWT_SECRET` env var
- **Roles**: `admin` (full access), `parent` (view children), `child` (own data only)
- **Auth wall**: All `/api/*` routes except `/api/health` and `/api/auth/*` require valid JWT
- **Profile access**: Users can only access their own data; admins and parents can access children's data via `canAccessProfile()`
- **Admin-only**: Save to bank (`POST /api/generate/save`), import (`POST /api/subjects/import`)
- **Frontend**: `apiFetch()` from `client/src/utils/api.js` attaches Bearer token; on 401, clears token and redirects to login
- **Rate limiting**: 5 failed login attempts per profile triggers 5-minute lockout (in-memory)
- **Parent-child links**: Stored in `parent_child` table; set during migration

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
- Model: `claude-sonnet-4-5-20250929`
- System prompts emphasize returning **only** valid JSON (no markdown, no code fences)
- Prompts are age-group aware
- Supports multiple formats: `multiple_choice`, `free_text`, `mix`, `flashcard`
- Rate limiting: 20 API calls per hour (in-memory counter, resets on restart)
- Caching: Generated questions cached by hash of request parameters
- Study reports: AI analyses test results to produce structured reports with strengths, weak areas, study plans, and encouragement
- Learning profile context: When generating new tests, the user's cumulative weak areas are included in the prompt via `additionalContext` (not included in cache key)

### Spaced Repetition System
- **Algorithm**: Simplified SM-2 (SuperMemo 2)
- **Storage**: SQLite tables `card_progress` and `card_history`
- **Card Data**: Tracks interval, ease factor, repetitions, last seen, next due date
- **Review Outcomes**: correct, incorrect, skipped
- **Smart Review**: Surfaces cards due for review based on spaced repetition scheduling

### Progress Tracking
Progress is stored in SQLite across three tables:
- **card_progress**: Per-card spaced repetition data (interval, ease factor, next due)
- **card_history**: Individual review records (enables SQL aggregation for dashboard)
- **profile_stats**: Aggregate statistics (sessions, streaks, last session date)

The DAL reconstructs the same JSON shape the frontend expects.

### Study Reports & Learning Profiles
- **Test sessions**: Every completed dynamic test is recorded in `test_sessions` with full question/answer data
- **Study reports**: AI-generated reports stored in `test_reports`, linked to sessions; include summary, strengths, weak areas (with reasons and suggestions), a prioritised study plan, and encouragement
- **Learning profiles**: `learning_profiles` stores cumulative per-user weak/strong areas as JSON; updated after each report generation; weak areas are merged by area name (most recent score kept); used as context when generating new tests
- **Report shape** (stored as JSON in `test_reports.report_data`):
  ```json
  {
    "summary": "Performance overview",
    "strengths": ["area1", "area2"],
    "weakAreas": [{ "area": "...", "reason": "...", "suggestion": "..." }],
    "studyPlan": [{ "priority": 1, "topic": "...", "action": "...", "timeEstimate": "15 mins" }],
    "encouragement": "Motivational message"
  }
  ```

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
- `server/index.js` - Express app setup, health check, auth wall, DB initialization
- `server/db/index.js` - SQLite singleton (WAL mode, schema init, ALTER TABLE for auth columns)
- `server/db/schema.sql` - Database table definitions (includes `parent_child`)
- `server/db/migrate-json.js` - One-time JSON→SQLite migration script (sets roles, parent-child links)
- `server/dal/auth.js` - Data access: login profiles, PIN management, parent-child queries
- `server/dal/subjects.js` - Data access: subjects, themes, questions, import/export
- `server/dal/profiles.js` - Data access: user profiles (includes role in output)
- `server/dal/progress.js` - Data access: card progress, history, stats, due cards
- `server/dal/cache.js` - Data access: generated question cache
- `server/dal/reports.js` - Data access: test sessions, reports, learning profiles
- `server/routes/auth.js` - Authentication routes (login, PIN setup, token validation, children)
- `server/routes/claude.js` - AI-powered question generation, marking, study reports, and learning profiles
- `server/routes/questions.js` - Question bank API routes (delegates to DAL, admin-only for save/import)
- `server/routes/progress.js` - Progress tracking API routes (delegates to DAL, profile access checks)
- `server/middleware/auth.js` - JWT authentication, role checking, profile access control
- `server/utils/spacedRepetition.js` - SM-2 algorithm for review scheduling
- `server/utils/streaks.js` - Statistics and streak tracking

### Frontend Core
- `client/src/App.jsx` - React Router setup, auth state, conditional routing (Login vs app)
- `client/src/utils/api.js` - Authenticated fetch wrapper (`apiFetch`) with 401 handling
- `client/src/pages/Login.jsx` - PIN-based login with profile selection and first-time PIN setup
- `client/src/pages/FamilyDashboard.jsx` - Admin/parent view of children's stats and reports
- `client/src/components/PinInput.jsx` - 4-6 digit PIN input with auto-advance
- `client/src/context/ThemeContext.jsx` - Theme provider (dark/light/high contrast)
- `client/src/pages/Dashboard.jsx` - Progress analytics, charts, and test reports
- `client/src/pages/DynamicTest.jsx` - Dynamic test flow with pause-for-feedback
- `client/src/pages/SmartReview.jsx` - Spaced repetition study mode
- `client/src/components/StudyReport.jsx` - Renders AI study report (strengths, weak areas, study plan)
- `client/src/components/dashboard/TestReports.jsx` - Dashboard section listing past test reports
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
- Tailscale: `http://pi-hostname:3001` (from anywhere, if Tailscale is set up)

Network URLs are displayed on server startup using Node's `os.networkInterfaces()`.

## Raspberry Pi Deployment

### Target hardware
- Raspberry Pi 3 or Zero 2W (1GB RAM)
- PM2 memory limit set to 150MB to protect the system

### First-time Pi setup
```bash
# On the Pi:
git clone https://github.com/Chris-HT/re-vision.git ~/revision
cd ~/revision
bash scripts/pi-setup.sh
```
This installs Node.js 20 LTS, PM2, build tools, dependencies, builds the client, creates `.env`, runs the migration, starts PM2, and configures auto-start on boot.

### Deploying updates to the Pi
After pushing changes to GitHub from your dev machine:
```bash
# SSH into the Pi, then:
bash ~/revision/scripts/deploy.sh
```
This runs `git pull`, `npm run install-all`, `npm run build`, and `pm2 restart revision`.

### Setting up remote access (Tailscale)
```bash
# On the Pi:
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
Then install Tailscale on family phones/laptops. Access the app from anywhere via the Pi's Tailscale hostname.

### Development workflow
1. Develop on any machine using `npm run dev`
2. Commit and push to GitHub (`master` branch)
3. SSH into Pi and run `bash ~/revision/scripts/deploy.sh`
4. Changes are live on the home network (and via Tailscale)

### Important notes
- The SQLite DB (`data/revision.db`) is **per-machine** and gitignored
- The Pi's DB is the production database - it accumulates real progress data
- The JSON files in `data/` are seed data for initial migration only
- To back up the Pi's data: copy `~/revision/data/revision.db` to a safe location
- `better-sqlite3` has prebuilt ARM binaries, but `build-essential` + `python3` are installed as fallback
