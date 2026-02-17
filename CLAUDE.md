# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

RE-VISION is a locally-hosted flashcard and dynamic test platform for a family studying for certifications and school exams. Runs on a home network Raspberry Pi, serving three user profiles with different age groups (adult, secondary, primary).

**Stack**: React 18 + Vite + Tailwind CSS / Express.js (ES modules) / SQLite (better-sqlite3) / Anthropic Claude API / PM2 on Raspberry Pi

**Repo**: `https://github.com/Chris-HT/re-vision.git` (public)

---

## Lifecycle Management

### Branch Strategy
| Branch | Purpose | Dev docs included? |
|--------|---------|-------------------|
| `dev` | Active development | Yes (CLAUDE.md, phase docs, .claude/) |
| `master` | Production — Pi deploys from here | No |

### Daily Development (stay on `dev`)
```bash
git checkout dev
# ...make changes...
git add <files>
git commit -m "description"
git push origin dev
```

### Deploy to Pi
```bash
# 1. Merge to master
git checkout master
git merge dev
git push origin master
git checkout dev          # always return to dev immediately

# 2. On the Pi (via SSH)
bash ~/revision/scripts/deploy.sh
```

### Pi Management (SSH: `christhompson@192.168.68.67`)
```bash
pm2 status                # check app status
npm run prod:logs         # view live logs
npm run prod:restart      # restart app
pm2 restart revision --update-env  # restart with new env vars
```

### First-time Pi Setup
```bash
# On the Pi:
git clone https://github.com/Chris-HT/re-vision.git ~/revision
cd ~/revision
bash scripts/pi-setup.sh  # installs Node, PM2, deps, builds, migrates, starts
nano .env                  # add ANTHROPIC_API_KEY and JWT_SECRET
pm2 restart revision --update-env
```

### Pi Notes
- App runs at `http://192.168.68.67:3001` (and any network device on LAN)
- PM2 memory limit: 150MB (Pi hardware constraint)
- SQLite DB (`data/revision.db`) is **per-machine**, gitignored — Pi DB is production data
- Back up Pi DB: `scp christhompson@192.168.68.67:~/revision/data/revision.db ./backup.db`
- Tailscale (optional): `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up`

### Merging Conflicts
When merging `dev` → `master`, `CLAUDE.md` will always conflict (deleted on master, modified on dev). Resolve by keeping it deleted:
```bash
git rm CLAUDE.md
git commit -m "Merge dev: <description> (keep CLAUDE.md dev-only)"
```

---

## Development Commands

```bash
# Setup (new machine)
npm run install-all   # install all deps (root + client + server)
npm run migrate       # create data/revision.db from JSON seed files (one-time)

# Dev
npm run dev           # client (port 5173) + server (port 3001) concurrently
npm run client        # Vite only
npm run server        # Express only (--watch)

# Production (Pi)
npm run build         # build React to client/dist
npm run prod:start    # start with PM2
npm run prod:restart  # restart PM2
npm run prod:logs     # PM2 logs
```

**Environment**: `.env` in project root. Required: `ANTHROPIC_API_KEY`, `JWT_SECRET` (auto-generated if unset). Server finds it via `__dirname`-relative path in `server/index.js`.

---

## Architecture

### Structure
```
re-vision/
├── client/src/
│   ├── components/        # Reusable UI (see File Organisation below)
│   ├── context/           # ThemeContext, GamificationContext, StudyTimerContext
│   ├── hooks/             # useQuestions, useProgress, useTimer
│   ├── pages/             # Route-level components
│   └── utils/             # api.js (apiFetch), featureGating.js
├── server/
│   ├── dal/               # Data access layer (all DB ops)
│   ├── db/                # SQLite singleton, schema.sql, migration
│   ├── middleware/         # auth.js, errorHandler.js
│   ├── routes/            # Thin API controllers
│   └── utils/             # spacedRepetition.js, streaks.js
├── scripts/
│   ├── pi-setup.sh        # One-time Pi setup
│   └── deploy.sh          # git pull + build + pm2 restart
├── data/                  # revision.db (gitignored), JSON seed files
└── ecosystem.config.cjs   # PM2 config
```

- **Dev**: Vite (5173) proxies `/api/*` → Express (3001)
- **Prod**: Express serves `client/dist` and handles API routes; binds `0.0.0.0`

### Database Tables
Full schema in `server/db/schema.sql`. Table groups:
- **Content**: `subjects`, `themes`, `questions`, `categories`
- **Auth**: `profiles` (+ pin_hash, role, engagement columns via ALTER), `parent_child`
- **Learning**: `card_progress`, `card_history`, `profile_stats`, `generated_cache`
- **Reports**: `test_sessions`, `test_reports`, `learning_profiles`
- **Gamification**: `profile_xp`, `subject_xp`, `profile_coins`, `coin_transactions`, `achievements`, `profile_achievements`
- **Tokens**: `profile_tokens`, `token_transactions`, `token_test_history`
- **Engagement**: `weekly_streaks`, `quest_definitions`, `profile_quests`, `profile_reward_state`

To re-migrate: delete `data/revision.db`, run `npm run migrate`.

---

## API Reference

### Auth (`/api/auth/*`) — no JWT required
| Method | Path | Description |
|--------|------|-------------|
| GET | `/profiles` | Profile list for login screen |
| POST | `/login` | Verify PIN → JWT |
| POST | `/set-pin` | First-time PIN setup |
| GET | `/me` | Validate token |
| POST | `/change-pin` | Change PIN (authenticated) |
| GET | `/children` | Linked children (admin/parent only) |

### Questions (`/api/*`) — JWT required
| Method | Path | Description |
|--------|------|-------------|
| GET | `/subjects` | All subjects + themes |
| GET | `/subjects/:id/questions` | Questions (optional `?theme=`) |
| GET | `/profiles` | User profiles |
| POST | `/generate/save` | Save AI questions to bank (admin only) |

### Claude AI (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server status + API key check |
| POST | `/generate` | Generate questions (cached by params hash) |
| POST | `/mark` | Auto-mark free-text answers |
| POST | `/report` | Generate study report, save session, update learning profile |
| GET | `/reports/:profileId` | Recent test reports |
| GET | `/learning-profile/:profileId` | Cumulative weak/strong areas |

### Progress (`/api/progress/:profileId/*`) — JWT + `canAccessProfile`
`record`, `due`, `stats`, `weekly-streak`, `quests`, `reward-state`, `daily-bonus-used`

### Gamification (`/api/gamification/:profileId/*`)
`GET` (XP/coins/achievements), `POST /award` (body: `{ xp, coins, reason, subjectId? }`), `GET /achievements`

### Tokens (`/api/tokens/*`)
`GET /children/summary` (admin/parent), `GET /:profileId`, `GET /:profileId/transactions`, `PUT /:profileId/rate`

---

## Conventions

### Styling
- **Theme colours**: Always use CSS variables via inline `style` props — never hardcode Tailwind colour classes for base theme colours
  ```jsx
  style={{ backgroundColor: 'var(--bg-card-solid)' }}   // correct
  style={{ color: 'var(--text-primary)' }}               // correct
  className="bg-slate-800 text-white"                    // WRONG
  ```
- **Accent/status colours**: Tailwind classes are fine (`text-green-400`, `bg-blue-600`, `text-red-400`)
- **Themes**: `dark` (default), `light`, `high-contrast` — switched via `data-theme` on `<html>`, variables in `client/src/index.css`
- **Design**: ADHD-friendly — chunked content, colour-coded, minimal clutter

### Authentication
- PIN login → JWT (24h), stored in `localStorage`
- Roles: `admin` (full), `parent` (view children), `child` (own data)
- All `/api/*` routes require JWT except `/api/health` and `/api/auth/*`
- `apiFetch()` in `client/src/utils/api.js` attaches token; throws + redirects on 401
- Profile access: `canAccessProfile()` middleware — own data or parent/admin
- Rate limit: 5 failed logins → 5-min lockout (in-memory)

### Age Groups
- `primary` — simple language, very encouraging (KS1/KS2)
- `secondary` — balanced tone (KS3/KS4/GCSE)
- `adult` — technical, professional (certifications)

### Claude API
- Model: `claude-sonnet-4-5-20250929`
- Prompts request **JSON only** (no markdown fences)
- Rate limit: 20 calls/hour (in-memory); cached responses are free
- Cache key: MD5 of `{topic, ageGroup, difficulty, count, format}` — `additionalContext` excluded intentionally
- Error details only in responses when `NODE_ENV !== 'production'`

### Gamification
XP is optimistic (client-side), synced at session boundaries. Level curve: `xpRequired = 100 × 1.5^(level-1)`.

| Action | XP | Coins |
|--------|-----|-------|
| Flashcard correct | 10 | 5 |
| Flashcard incorrect/skip | 3 | 0 |
| Test answer ≥70% | 15 | 8 |
| Test answer 40–69% | 8 | 3 |
| Test answer <40% | 3 | 0 |
| Test completion bonus | 50 | 20 |

Combo multiplier: 1.5× at 3 streak, 2× at 5 streak. Resets on incorrect/skip.

### Family Tokens
Awarded server-side only after study report generation. Score gate: <50% = 0 tokens.
Base: easy=2, medium=3, hard=5 × `ceil(base × (score-50)/50)`.
Diminishing returns per test key: 1st=100%, 2nd=50%, 3rd=25%, 4th+=0. Daily cap: 10.

### Progressive Disclosure
`isFeatureUnlocked()` in `client/src/utils/featureGating.js`:
- Adults: all features from level 1
- Primary/secondary: Level 1=XP+coins, Level 3=quests+variable rewards, Level 5=achievements+streaks

### Spaced Repetition (SM-2)
Card states: `correct`, `incorrect`, `skipped`. Tracks interval, ease factor, repetitions, next due date in `card_progress` + `card_history`.

### Study Reports
Stored as JSON in `test_reports.report_data`:
```json
{
  "summary": "...",
  "strengths": ["area1"],
  "weakAreas": [{ "area": "...", "reason": "...", "suggestion": "..." }],
  "studyPlan": [{ "priority": 1, "topic": "...", "action": "...", "timeEstimate": "15 mins" }],
  "encouragement": "..."
}
```
Learning profiles merge weak areas by name (case-insensitive); used as `additionalContext` on next test generation.

---

## Completed Features

All phases are complete through **Phase 7e**:
- Flashcard study, SM-2 spaced repetition (Smart Review), dynamic AI test generation
- Auto-marking, question caching, save-to-bank
- Progress dashboard, analytics, PDF export, streak tracking
- SQLite data layer with full DAL, PM2 deployment, Pi scripts
- PIN auth, JWT, role-based access (admin/parent/child), Family Dashboard
- AI study reports, cumulative learning profiles, context-aware generation
- XP/levels/coins, combo multiplier, achievements (10 seeded), reward popups
- Family token system (real-money rewards for children)
- Weekly streaks (4-of-7 forgiving), break reminders, focus mode, session presets
- Daily/weekly quests (8 seeded), variable rewards (lucky questions, daily bonus, comeback bonus)
- Progressive feature disclosure by level, step indicators, session preview

---

## Common Tasks

### Add a Subject
Use the app's import feature, or `POST /api/generate/save` (admin), or add to JSON + re-run `npm run migrate`.

### Add an API Route
1. Create handler in `server/routes/`
2. Register in `server/index.js` via `app.use('/api', route)`
3. Use `next(error)` for async error propagation

### Add a Page
1. Create in `client/src/pages/`
2. Add route in `client/src/App.jsx`
3. Update `Navbar` if needed

### Key Files
- `server/index.js` — Express setup, auth wall, DB init
- `server/db/schema.sql` — All table definitions
- `server/middleware/auth.js` — `authenticate`, `requireRole`, `canAccessProfile`
- `client/src/App.jsx` — Router, auth state
- `client/src/utils/api.js` — `apiFetch` wrapper
- `client/src/context/GamificationContext.jsx` — XP, coins, reward queue
- `client/src/context/ThemeContext.jsx` — Theme + focus mode
- `ecosystem.config.cjs` — PM2 config
- `scripts/deploy.sh` — Pi deployment
