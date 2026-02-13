# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RE-VISION is a locally-hosted flashcard and dynamic test platform for a family studying for certifications and school exams. The app runs on the home network and serves three user profiles with different age groups (adult, secondary, primary).

## Tech Stack

- **Frontend**: React 18 + Vite, React Router, Tailwind CSS
- **Backend**: Express.js (ES modules)
- **Data Storage**: JSON files on disk (no database)
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
```

### Environment Setup
- Copy `.env.example` to `.env` and add your Anthropic API key
- The `.env` file is located in the project root, not in the server directory
- Server loads it via `dotenv.config({ path: path.join(process.cwd(), '..', '.env') })`

## Architecture

### Monorepo Structure
```
re-vision/
├── client/          # React frontend
├── server/          # Express backend
├── data/            # JSON data files
└── package.json     # Root workspace with concurrently script
```

### Client-Server Communication
- **Development**: Vite dev server (port 5173) proxies `/api/*` requests to Express (port 3001)
- **Production**: Express serves the built React app from `client/dist` and handles API routes
- Server binds to `0.0.0.0` to allow access from other devices on the network

### Data Architecture

**Subjects** → **Themes** → **Question Files**

Example flow:
1. `subjects.json` defines a subject (e.g., "power-bi") with themes
2. Each theme references a question file (e.g., "power-bi-semantic-models.json")
3. Question files contain questions grouped by category with color metadata

### Question Data Schema

Question files follow this structure:
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
      "question": "What do relationships control?",
      "answer": "How tables filter one another...",
      "difficulty": 1,
      "tags": ["basics"]
    }
  ]
}
```

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
- `POST /api/mark` - Auto-mark free-text answers using Claude API

### Generated Question Caching
- Generated questions are cached in `data/questions/generated/`
- Cache keys are created from request parameters (topic, ageGroup, difficulty, count, format)
- `data/questions/generated/index.json` tracks all cached generations
- Same request parameters return cached version without hitting API

## Frontend Patterns

### User Flow
1. **Home** → Select profile (sets age group context)
2. **Mode Selection** → Choose Flashcards or Dynamic Test
3. **Configuration** → Select subject/theme or generate new questions
4. **Study/Test** → Interactive learning experience
5. **Results** → Review performance and save generated questions

### State Management
- Profile state managed in `App.jsx` and passed to pages
- No global state library - uses React state and props
- Session results passed via React Router navigation state

### Styling Conventions
- Dark theme: `bg-gradient-to-br from-slate-900 to-slate-800`
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

### Phase 2 (Current)
- Claude API integration for dynamic test generation
- Auto-marking for free-text answers
- Question caching to minimize API costs
- Save generated questions to main bank

### Phase 3 (Future)
- Spaced repetition tracking
- Progress dashboard
- Export to PDF
- Timer mode for exam practice

## Important Conventions

### File Organization
- **Components**: Reusable UI elements (`FlashcardDeck`, `ConfigPanel`, etc.)
- **Pages**: Route-level components (`Home`, `Flashcards`, `DynamicTest`, `Results`)
- **Hooks**: Custom hooks for data fetching (`useQuestions.js`)
- **Routes**: Express route handlers grouped by domain (`questions.js`, `claude.js`)
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
- Rate limiting: 20 API calls per hour (in-memory counter, resets on restart)

## Common Development Tasks

### Adding a New Subject
1. Add entry to `data/subjects.json`
2. Create question file in `data/questions/`
3. Follow the question schema with meta, categories, and questions arrays

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

- `brief.md` - Original project specification (Phase 1)
- `PHASE2.md` - Claude API integration specification
- `server/index.js` - Express app setup, health check, directory initialization
- `server/routes/claude.js` - AI-powered question generation and marking
- `server/routes/questions.js` - Question bank CRUD operations
- `client/src/App.jsx` - React Router setup, profile state
- `client/vite.config.js` - API proxy configuration
- `data/subjects.json` - Master subject/theme index
- `data/profiles.json` - User profile definitions

## Network Configuration

Express binds to `0.0.0.0:3001` to allow access from:
- Local development: `http://localhost:3001`
- Network devices: `http://192.168.x.x:3001`

Network URLs are displayed on server startup using Node's `os.networkInterfaces()`.
