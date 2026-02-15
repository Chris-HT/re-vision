# Phase 7: ADHD & Autism-Friendly Design + Gamification

## Overview

Phase 7 enhances Re-Vision for neurodivergent learners, particularly those with ADHD and/or autism. Research covers UI/UX design patterns, sensory considerations, gamification mechanics, and reward systems. The goal is to make the app especially effective for brains that find focus difficult, while maintaining usability for all family members.

**Note**: The family already plans to use monetary rewards for test completion as an incentive. This phase integrates that alongside digital reward systems.

---

## Research Summary

### What the App Already Does Well

- One question at a time with no auto-advance (Phase 5)
- Color-coded categories and chunked content
- Dark theme with slate gradients (reduces visual strain)
- User-controlled pacing ("Next Question" button)
- Age-appropriate language and feedback tones
- Timer with user control
- High-contrast theme option for accessibility
- Minimal clutter, card-based layouts

---

## Part A: Accessibility & Sensory Design

### A1. Literal Language Audit

**Why**: Autistic users interpret language literally. Idioms, metaphors, and playful language can confuse rather than engage. This also benefits younger children who haven't learned figurative language yet.

**Changes needed across all UI copy**:

| Current Pattern | Replace With |
|---|---|
| "Let's crush this test!" | "Start the test" |
| "You're on fire!" | "You've answered 5 correctly in a row" |
| "Almost there!" | "9 of 10 questions complete" |
| "Oops, something went wrong!" | "Error: Unable to save. Please check your connection." |
| "Dive into studying" | "Start studying" |
| "Hop to it!" | "Begin now" |
| "Great job!" (vague) | "You scored 8 out of 10" (concrete) |
| "A few minutes" | "About 5 minutes" |
| "Some cards" | "10 flashcards" |

**AI-generated content**: Update Claude API system prompts to include a `literalLanguage` flag. When enabled, instruct Claude to avoid idioms, metaphors, and figurative language in study reports and feedback.

**Button labels**: Use imperative, explicit text:
- "Go" → "Start Test"
- "Ready?" → "Click Start when you are ready"
- "Let's Go!" → "Begin Studying"

### A2. Reduced Motion Support

**Why**: 74% of autistic children experience sensory differences. Unexpected animations can trigger sensory overload. ADHD users can also be distracted by excessive motion.

**Implementation**:

1. Add CSS media query to `client/src/index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

2. Add per-profile "Reduce animations" toggle in settings, stored alongside theme preference.

3. When enabled, disable:
   - Card flip animations
   - Confetti/celebration effects
   - Progress bar transitions
   - Page transition animations
   - Any future gamification animations

4. When disabled, keep animations subtle and purposeful:
   - Fade-ins (not slides/bounces)
   - Brief celebrations (under 2 seconds)
   - No infinite loops or auto-playing animations

### A3. Sensory-Friendly Theme

**Why**: Research shows muted, low-saturation colours are calming for both ADHD and autistic users. Pure white backgrounds are tiring; bright/saturated colours can trigger sensory overload.

**New theme: "Calm"**

```css
[data-theme="calm"] {
  --bg-primary: #f5f2ed;       /* Warm beige */
  --bg-secondary: #e8e4dd;     /* Soft stone */
  --bg-card-solid: #fdfcfb;    /* Near-white cream */
  --bg-input: #ffffff;
  --text-primary: #4a4a4a;     /* Soft dark grey */
  --text-secondary: #6b6b6b;
  --text-muted: #9a9a9a;
  --border-color: #d4cfc7;
  --gradient-from: #e8f4f1;    /* Soft mint */
  --gradient-to: #f0e8f4;      /* Soft lavender */
}
```

**Accent colours for calm theme** (muted versions):
- Success: `#7fb069` (muted green)
- Warning: `#f4a261` (muted amber)
- Error: `#e76f51` (muted coral)
- Info: `#82c0cc` (muted teal)

### A4. Font Size Controls

**Why**: 81% of neurodivergent users value customisable display settings. Adjustable text size reduces strain and improves readability.

**Implementation**:
- Add per-profile font size preference: small / medium / large
- Store in profile preferences (alongside theme)
- Apply via CSS custom property on document root:
  - Small: `--font-scale: 0.875` (14px base)
  - Medium: `--font-scale: 1` (16px base) — default
  - Large: `--font-scale: 1.25` (20px base)
- Apply globally using `font-size: calc(1rem * var(--font-scale))`

**Typography best practices to apply**:
- Default line-height: 1.6-1.8 (increase from typical 1.5)
- Left-aligned text only (never justified — causes "river effect")
- Sans-serif fonts throughout (already using Tailwind defaults)
- Consider optional OpenDyslexic font as a future enhancement
- Minimum 16px base font size
- Clear letter spacing and word spacing

### A5. Animation Toggle

**Why**: Separate from `prefers-reduced-motion` (which is OS-level), this gives per-profile control within the app. Some family members may want animations while others don't.

**Implementation**:
- Per-profile setting: "Show animations" (on/off)
- When off: disable all non-essential transitions and effects
- When on: respect the `prefers-reduced-motion` media query as a fallback
- Store as `reduceAnimations: boolean` in profile preferences

### A6. Sound Controls

**Why**: All sounds must be optional. Autistic users may be hypersensitive to audio; ADHD users may find sounds helpful for feedback. Never auto-play audio.

**Implementation**:
- Per-profile setting: "Sound effects" (on/off), default OFF
- Per-profile setting: "Sound volume" (slider, 0-100%)
- Sound categories (independently toggleable in future):
  - Answer feedback (correct/incorrect)
  - Achievement/milestone celebrations
  - Timer warnings
- All sounds should be soft, low-frequency, and non-startling
- Visual alternatives must exist for every audio cue

---

## Part B: UX Patterns for Neurodivergent Users

### B1. Break Reminders

**Why**: "Time blindness" is a core ADHD challenge. The "10-3 Rule" (10 min focus, 3 min break) is more effective than Pomodoro (25 min) for ADHD. Autistic users also benefit from structured breaks to prevent sensory/cognitive overload.

**Implementation**:
- After configurable interval (default 15 min), show gentle prompt:
  - "Great focus! Take a 3-minute break?"
  - Two buttons: "Take a Break" / "Keep Going"
- Optional break timer countdown: "Back in 2:30..."
- Configurable per profile:
  - Break interval: 10 / 15 / 20 / 25 min (or off)
  - Break duration: 3 / 5 / 10 min
- After 45+ min continuous study, stronger suggestion: "You've been studying for 45 minutes. Consider stopping for today."
- Track cumulative session time in the background

### B2. Session Size Presets

**Why**: ADHD optimal session length is 10-15 minutes, not 25-30. Shorter sessions with clear endpoints reduce anxiety and improve completion rates.

**Default presets by age group**:
- **Primary**: "Quick Practice" (5 cards, ~3 min), "Standard" (8 cards, ~5 min), "Extended" (12 cards, ~8 min)
- **Secondary**: "Quick Practice" (8 cards, ~5 min), "Standard" (12 cards, ~8 min), "Extended" (18 cards, ~12 min)
- **Adult**: "Quick Practice" (10 cards, ~7 min), "Standard" (15 cards, ~10 min), "Extended" (25 cards, ~15 min)

**UI**: Show presets as quick-select buttons on flashcard/test config screens, with estimated time displayed.

### B3. Transition Warnings

**Why**: Autistic users need predictability about what's coming next. Advance notice before transitions reduces anxiety and allows mental preparation.

**Implementation**:
- Timer warnings: Visual countdown changes colour (green → amber at 2 min → red at 30 sec)
- Pre-transition messaging:
  - Before test ends: "Next: You'll see your results"
  - Before leaving a page: "You're about to leave this session"
  - Timer about to expire: "30 seconds remaining"
- Session preview before starting:
  - "You'll answer 10 questions about Geography"
  - "Format: Multiple choice"
  - "Estimated time: 8 minutes"
- Step indicators in multi-step flows: "Step 2 of 3: Choose difficulty"
- Post-session transition screen: "Session complete! You reviewed 15 cards." with clear "Return to Menu" or "Start Another Session" buttons

### B4. Focus Mode

**Why**: Reduces distractions (ADHD) and sensory input (autism) simultaneously. Shows only what's needed for the current task.

**Implementation**:
- Toggle button (accessible from navbar or settings)
- When enabled:
  - Hide navbar (show minimal back button only)
  - Hide decorative elements, stats badges, sidebar info
  - Show only: current question/card, answer input, progress bar, next/submit button
  - Increase content area size
  - Mute colour palette (fewer accent colours)
  - Disable non-essential animations
- Quick toggle: keyboard shortcut (e.g., `F` key) and button in corner

### B5. Explicit Success/Error Messages

**Why**: Both ADHD and autistic users need concrete, specific feedback. Vague messages create uncertainty.

**Patterns**:
- After answering: "Correct! The answer is photosynthesis." (not just a green checkmark)
- After saving: "Your progress has been saved" (toast notification)
- On error: "Unable to load questions. Check your internet connection and try again." (not "Something went wrong")
- Scores: "You scored 8 out of 10 (80%)" (not "Great job!")
- Progress: "You have reviewed 12 of 30 cards today" (not "Keep going!")

### B6. Visual Schedule / Session Preview

**Why**: Structured work systems using visual cues help autistic users understand "what to do first, what comes next, and what to do when finished."

**Implementation**:
- Before starting any study mode, show a brief overview:
  - What: "10 Geography flashcards"
  - How long: "About 8 minutes"
  - Format: "Multiple choice"
  - What happens after: "You'll see your results and can generate a study report"
- During session: always-visible progress indicator
- After session: clear summary with explicit next steps

### B7. Consistent, Predictable Navigation

**Why**: Autistic users thrive on routine and structure. Consistent navigation reduces cognitive load for ADHD users too.

**Principles**:
- Same navigation elements in same positions on every page
- "Back" and "Quit" buttons always in the same location
- No surprise pop-ups or auto-redirects
- Maximum 4-5 primary navigation options
- Breadcrumb-style indicators for nested pages
- All interactive elements obviously clickable (clear hover/focus states)

### B8. Icons + Text Labels

**Why**: Autistic users process icons + text together faster than either alone. Icons alone can be ambiguous.

**Implementation**:
- All navigation items: icon + text label (already partially doing this)
- All buttons with icons: include text label
- Consistent icon set throughout the app
- Use literal, representational icons (not abstract metaphors)

---

## Part C: Gamification & Reward Systems

### C1. Immediate Micro-Rewards

**Why**: ADHD brains require immediate feedback — delayed rewards hold minimal value. Every correct answer needs a dopamine hit.

**Implementation**:
- After EVERY correct answer:
  - Visual: coin/XP animation, green flash, checkmark
  - Audio (if enabled): gentle chime
  - Text: "+10 XP" or "+5 coins" popup (brief, non-blocking)
- Combo multipliers: "3 correct in a row! 1.5x XP!"
- Mini-celebrations every 5 questions: small confetti burst or sparkle (if animations enabled)
- Wrong answers: gentle red highlight + "The correct answer is..." — never punishing
- All micro-reward animations: brief (under 1.5 sec), non-blocking, skippable

### C2. XP & Leveling System

**Why**: Clear progression creates motivation. Subject-specific leveling adds depth. Fast early progression builds momentum.

**Implementation**:
- **Global XP**: Total across all subjects, determines overall level
- **Subject XP**: Per-subject tracking (Geography Level 5, History Level 3)
- **XP sources**:
  - Correct answer: 10 XP
  - Combo bonus (3+ correct): +5 XP per question
  - Test completion: 50 XP base + (score% * 50) bonus
  - Flashcard session completion: 30 XP
  - Smart Review session: 40 XP
- **Level curve**: Fast early levels, gradually slower
  - Level 1→2: 100 XP
  - Level 2→3: 150 XP
  - Level 5→6: 300 XP
  - Level 10→11: 600 XP
- **Level-up celebration**: Full-screen brief animation with new level badge
- **Always-visible XP bar**: "450/500 XP to Level 6" in navbar or profile area

### C3. Study Coins (Digital Currency)

**Why**: Separates intrinsic motivation (learning for fun/mastery) from extrinsic motivation (monetary rewards). Coins fund digital unlockables.

**Implementation**:
- **Earning**:
  - Correct answer: 5 coins
  - Test completion: 20 coins
  - Achievement unlock: varies (10-100 coins)
  - Daily quest completion: 15 coins
- **Spending**:
  - Avatar accessories
  - Theme unlocks (new colour schemes)
  - Celebration style packs (different confetti types)
  - Profile frame designs
- **NOT convertible to real money** — this is deliberate
- **Coin counter**: Always visible in navbar as a small badge
- **Coin transaction log**: Viewable in profile settings

### C4. Family Tokens (Monetary Rewards)

**Why**: The family specifically wants monetary incentives. Research supports token economies for ADHD when properly structured with parent oversight.

**Implementation**:
- **Earning**:
  - Completed test: 2-5 tokens (based on difficulty and score)
  - Weekly streak maintained: 5 bonus tokens
  - Subject level-up: 3 tokens
- **Conversion**: Parent-set rate per child (e.g., 10 tokens = £1)
- **Redemption flow**:
  1. Child clicks "Redeem Tokens" in their profile
  2. Selects amount to redeem
  3. Request appears in Family Dashboard for parent
  4. Parent approves/denies with optional note
  5. Child sees "Approved" status + updated balance
- **Anti-gaming measures**:
  - Daily token cap (e.g., max 10 tokens/day)
  - Diminishing returns for repeating same easy test
  - Higher difficulty = more tokens
  - Score threshold: minimum 50% to earn tokens
- **Parent controls (Family Dashboard)**:
  - Set/change conversion rate per child
  - View token earning history (detect gaming patterns)
  - Approve/deny redemptions
  - Pause token earning temporarily
  - Set custom token values for specific test types

### C5. Forgiving Streak System

**Why**: Research shows broken streaks cause shame spirals and app abandonment in ADHD users. Duolingo's aggressive streak notifications are cited as a negative pattern. Weekly streaks with safety nets maintain motivation without guilt.

**Implementation**:
- **Weekly streaks** (not daily): Complete study on 4 of 7 days to maintain streak
- **Streak Freeze items**: Earned through play (1 free per week, extras cost 50 Study Coins). Automatically protects one missed day.
- **Grace period**: Miss 1 day, but completing 2 sessions next day recovers the streak
- **Positive messaging only**:
  - Returning after break: "Welcome back! Ready to start a new streak?"
  - Never: "You broke your streak!" or "You missed yesterday!"
  - Streak at risk: "Study today to keep your 3-week streak going!" (gentle, not guilt-inducing)
- **Streak counter**: Shows current weekly streak and longest ever
- **Streak milestones**: 4 weeks, 8 weeks, 12 weeks, 26 weeks, 52 weeks — each with unique badge
- **Opt-out**: Users can hide streak counter entirely if it causes stress

### C6. Achievement System

**Why**: Variety prevents habituation. Hidden achievements add novelty. Progress-based (not perfection-based) achievements avoid triggering perfectionism.

**Achievement categories**:

**Consistency**:
- "First Steps" — Complete your first study session
- "Week Warrior" — Maintain a 4-week streak
- "Dedicated Learner" — Study 50 sessions total
- "Study Habit" — Study on 100 different days

**Progress**:
- "Rising Star" — Reach Level 5 in any subject
- "Subject Expert" — Reach Level 10 in any subject
- "Well Rounded" — Study 3+ different subjects
- "Improver" — Score 20% higher than your average on a test

**Performance**:
- "Perfect Score" — Score 100% on a test with 10+ questions
- "Speed Learner" — Complete a timed test with 90%+ accuracy
- "Mastery" — Get 50 flashcards to "mastered" status in spaced repetition

**Fun / Hidden** (discoverable):
- "Night Owl" — Study after 9pm
- "Early Bird" — Study before 7am
- "Weekend Scholar" — Study on both Saturday and Sunday
- "Birthday Learner" — Study on your birthday
- "Marathon" — Study for 30+ minutes in one session

**Social / Family**:
- "Study Buddy" — Study on the same day as another family member
- "Family Effort" — All family members study in the same week
- "Helping Hand" — Parent reviews a child's study report

**Implementation notes**:
- Show locked achievements with "???" descriptions to create curiosity
- Unlock animation: badge reveal with optional sound
- Achievement gallery in profile page
- Each achievement awards Study Coins (10-100)
- Some achievements award Family Tokens (1-5)
- Achievement notifications: non-blocking toast in corner

### C7. Variable Rewards

**Why**: ADHD brains habituate quickly to predictable rewards. Variable ratio reinforcement (like slot machines, but ethical) is the most powerful engagement mechanic.

**Implementation**:
- **Lucky Question** (5% random chance): "Lucky Question! Double coins for this one!"
- **Mystery Box** (appears after every 20th question): Contains random reward (XP boost, coins, streak freeze, avatar item)
- **Daily Bonus**: First session of the day awards 2x XP
- **Comeback Bonus**: Returning after 3+ days away: "Welcome back! Here's a bonus to get you started" (+50 coins)
- **Rotating Daily Challenges**: "Score 80%+ on a Geography test today" (different each day)
- **All variable rewards are opt-in**: Can be disabled in settings for users who prefer predictability (autism consideration)

### C8. Progressive Disclosure

**Why**: Too many game mechanics at once create executive dysfunction and overwhelm. Research from Habitica shows complex systems drive ADHD users away.

**Implementation** — unlock features gradually:
- **New user (Level 1)**: Just XP, basic progress bar, coins for correct answers
- **Level 3**: Daily quests appear
- **Level 5**: Achievement gallery unlocked, streak tracking begins
- **Level 8**: Weekly missions available
- **Level 10**: Avatar customisation shop opens
- **Level 15**: Subject campaigns / quest chains

**First-session experience**:
1. Welcome message explaining XP: "Answer questions to earn XP and level up!"
2. First correct answer: XP popup with brief explanation
3. Session complete: Coins awarded with brief explanation
4. No mention of streaks, quests, tokens, or achievements yet

### C9. Quests & Missions

**Why**: Quest framing adds narrative purpose to study sessions. Daily quests provide achievable goals; weekly missions add longer-term motivation.

**Quest types**:

**Daily Quests** (reset each day, pick 1-3):
- "Complete 1 study session" (easy, guaranteed achievable)
- "Answer 10 questions correctly" (moderate)
- "Score 80%+ on a test" (challenging)
- Reward: 15-30 coins + 25-50 XP

**Weekly Missions** (reset Monday, pick 1-2):
- "Complete 3 tests this week"
- "Study 3 different subjects"
- "Maintain your streak all week"
- Reward: 50-100 coins + 100-200 XP + 2-3 Family Tokens

**Subject Campaigns** (long-term, per subject):
- Multi-step quest chains: "Geography Explorer: Complete 5 Geography tests"
- Progressive difficulty: each step harder than the last
- Completion unlocks subject-specific badge + theme
- Reward: 200 coins + special achievement

### C10. Unlockables

**Why**: Tangible digital rewards that accumulate over time create a sense of investment. Customisation gives users ownership of their experience.

**Categories**:
- **Avatar frames**: Border designs for profile icon (5-50 coins each)
- **Theme packs**: Additional UI colour schemes (100 coins each)
- **Celebration styles**: Different confetti/sparkle animations (30 coins each)
- **Profile badges**: Displayable achievement badges (earned, not purchased)
- **Card styles**: Different flashcard appearance options (50 coins each)

---

## Part D: Age-Specific Considerations

### Primary Age (KS1/KS2)

- Shorter sessions: 5-8 cards max, 3-5 min
- More frequent rewards: every 2-3 cards
- Simpler language: "Well done!" not "Exemplary performance"
- Larger buttons and text
- More visual celebration (bigger animations, brighter reward visuals)
- Parent notifications when sessions complete
- Simpler quest descriptions
- Lower thresholds for achievements
- Higher coin/XP rates (faster progression to maintain interest)

### Secondary Age (KS3/KS4/GCSE)

- Moderate sessions: 10-15 cards, 8-12 min
- Balance autonomy and structure: choices within guardrails
- Achievement focus: badges, streaks, subject levels
- Social elements: study-together awareness with family
- Clear progress toward goals: "X% ready for exam"
- Mild competition: optional family leaderboard
- More complex quests and campaigns

### Adult (Certifications)

- Flexible session length: user-defined, but nudge toward 15-20 min
- Detailed analytics: deep dive into weak areas and trends
- Professional tone: encouraging but not patronising
- Maximum customisation control
- Advanced features available from the start (skip progressive disclosure)
- Option to disable gamification elements entirely
- Focus on intrinsic motivation: progress charts, mastery tracking

---

## Part E: Anti-Patterns to Avoid

### Cognitive Overload
- No walls of text — use bullet points, short paragraphs, collapsible sections
- Maximum 5-7 choices per screen (Hick's Law)
- Clear, unambiguous navigation with visible back/forward buttons
- Auto-save everywhere — never force completion without pause/resume
- Generous whitespace between elements

### Visual & Motion Problems
- No auto-playing videos or audio
- No pop-ups or timed modals (except essential confirmations)
- No infinite scrolling — use pagination with clear progress
- No flashing or rapidly changing visuals
- No background animations or moving elements in peripheral vision

### Typography Errors
- No decorative or script fonts
- No low-contrast text (grey on grey, pastels on white)
- No justified text alignment
- No ALL CAPS for body text
- No font sizes below 16px base

### UX Flow Problems
- Always show progress indicators in multi-step flows
- Inline validation, not just post-submission errors
- Confirmation dialogs for destructive actions (but keep them simple: 2 buttons max)
- Surface key features — don't bury important functions 3 levels deep
- Consistent interaction patterns throughout the app

### Reward & Motivation Failures
- No punishment for mistakes — always positive framing
- No repetitive, unchanging rewards — rotate variety
- No invisible progress — always show growth
- No rigid time limits without pause option
- No guilt-inducing language for missed sessions or broken streaks
- No comparing users against each other by default

---

## Database Schema Additions

```sql
-- XP and leveling
CREATE TABLE IF NOT EXISTS profile_xp (
  profile_id INTEGER PRIMARY KEY,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS subject_xp (
  profile_id INTEGER,
  subject_id INTEGER,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  PRIMARY KEY (profile_id, subject_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  hidden BOOLEAN DEFAULT 0,
  coin_reward INTEGER DEFAULT 0,
  token_reward INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS profile_achievements (
  profile_id INTEGER,
  achievement_id INTEGER,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (profile_id, achievement_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- Streaks (forgiving weekly streaks)
CREATE TABLE IF NOT EXISTS profile_streaks (
  profile_id INTEGER PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  freeze_count INTEGER DEFAULT 0,
  weekly_completions TEXT,  -- JSON: {"2026-W07": 4, "2026-W08": 6}
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

-- Study Coins (digital, non-monetary)
CREATE TABLE IF NOT EXISTS profile_coins (
  profile_id INTEGER PRIMARY KEY,
  coins INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER,
  amount INTEGER,
  reason TEXT,
  transaction_type TEXT,  -- 'earned' or 'spent'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

-- Family Tokens (monetary)
CREATE TABLE IF NOT EXISTS profile_tokens (
  profile_id INTEGER PRIMARY KEY,
  tokens INTEGER DEFAULT 0,
  pending_redemption INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_redeemed INTEGER DEFAULT 0,
  token_rate REAL DEFAULT 0.10,  -- £ per token, parent-adjustable
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS token_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER,
  amount INTEGER,
  reason TEXT,
  transaction_type TEXT,  -- 'earned', 'redeemed', 'approved', 'denied'
  approved_by INTEGER,    -- parent/admin profile_id
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (approved_by) REFERENCES profiles(id)
);

-- Unlockables
CREATE TABLE IF NOT EXISTS unlockables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,      -- 'avatar_frame', 'theme', 'celebration', 'card_style'
  cost INTEGER,       -- in Study Coins
  unlock_level INTEGER,  -- minimum level requirement (0 = purchasable anytime)
  preview_data TEXT   -- JSON: description, colours, etc.
);

CREATE TABLE IF NOT EXISTS profile_unlockables (
  profile_id INTEGER,
  unlockable_id INTEGER,
  equipped BOOLEAN DEFAULT 0,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (profile_id, unlockable_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (unlockable_id) REFERENCES unlockables(id)
);

-- Quests
CREATE TABLE IF NOT EXISTS quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quest_type TEXT,       -- 'daily', 'weekly', 'campaign'
  subject_id INTEGER,    -- NULL for non-subject-specific quests
  requirements TEXT,     -- JSON: {"tests_completed": 3, "min_score": 80}
  rewards TEXT,          -- JSON: {"xp": 100, "coins": 50, "tokens": 2}
  active_from DATE,
  active_until DATE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS profile_quests (
  profile_id INTEGER,
  quest_id INTEGER,
  progress TEXT,         -- JSON: {"tests_completed": 1}
  completed BOOLEAN DEFAULT 0,
  completed_at DATETIME,
  PRIMARY KEY (profile_id, quest_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- Profile preferences (accessibility & sensory settings)
CREATE TABLE IF NOT EXISTS profile_preferences (
  profile_id INTEGER PRIMARY KEY,
  font_size TEXT DEFAULT 'medium',       -- 'small', 'medium', 'large'
  reduce_animations BOOLEAN DEFAULT 0,
  sound_effects BOOLEAN DEFAULT 0,
  sound_volume REAL DEFAULT 0.5,
  literal_language BOOLEAN DEFAULT 0,
  focus_mode BOOLEAN DEFAULT 0,
  break_interval INTEGER DEFAULT 15,     -- minutes, 0 = off
  break_duration INTEGER DEFAULT 3,      -- minutes
  show_streaks BOOLEAN DEFAULT 1,
  show_variable_rewards BOOLEAN DEFAULT 1,
  session_preset TEXT DEFAULT 'standard', -- 'quick', 'standard', 'extended'
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
```

---

## Implementation Phases

### Phase 7a: Accessibility & Sensory (Priority: High)
1. Literal language audit across all UI components and API prompts
2. Add `prefers-reduced-motion` CSS support
3. Add "Calm" theme to theme switcher
4. Add font size controls (small/medium/large per profile)
5. Add "Reduce animations" toggle per profile
6. Increase default line-height to 1.6
7. Add explicit success/error messages throughout
8. Create `profile_preferences` table and settings UI

### Phase 7b: Core Gamification (Priority: High)
1. Add XP/leveling system (global + per-subject)
2. Add Study Coins currency
3. Implement immediate micro-rewards (XP/coin popups on correct answers)
4. Implement combo multipliers
5. Add achievement system with 20+ initial achievements
6. Add XP bar and coin counter to navbar/profile area
7. Level-up celebration screen

### Phase 7c: Family Tokens & Rewards (Priority: Medium)
1. Add Family Token system
2. Token earning rules (per test, per milestone)
3. Token redemption flow (child request → parent approve)
4. Parent controls in Family Dashboard
5. Anti-gaming measures (daily caps, diminishing returns, score thresholds)
6. Token history and analytics

### Phase 7d: Engagement Features (Priority: Medium)
1. Forgiving weekly streak system with streak freeze
2. Break reminders with configurable intervals
3. Session size presets by age group
4. Session preview / visual schedule before starting
5. Focus Mode toggle
6. Transition warnings (timer colour changes, "what's next" messaging)

### Phase 7e: Advanced Gamification (Priority: Lower)
1. Daily quests and weekly missions
2. Variable rewards (lucky questions, mystery boxes, daily bonuses)
3. Progressive disclosure system (feature unlocking by level)
4. Subject campaigns / quest chains
5. Unlockables shop (avatar frames, themes, celebrations)
6. Step indicators in multi-step wizards

---

## Research Sources

### ADHD Design & Accessibility
- [Inclusive UX/UI for Neurodivergent Users](https://medium.com/design-bootcamp/inclusive-ux-ui-for-neurodivergent-users-best-practices-and-challenges-488677ed2c6e)
- [Software Accessibility for Users with ADHD](https://www.carlociccarelli.com/post/software-accessibility-for-users-with-attention-deficit-disorder)
- [UI/UX for ADHD: Designing Interfaces That Actually Help Students](https://din-studio.com/ui-ux-for-adhd-designing-interfaces-that-actually-help-students/)
- [UX Design for ADHD: When Focus Becomes a Challenge](https://medium.com/design-bootcamp/ux-design-for-adhd-when-focus-becomes-a-challenge-afe160804d94)
- [Designing for ADHD in UX - UXPA International](https://uxpa.org/designing-for-adhd-in-ux/)
- [Neurodiversity in UX | Inclusive Design Principles](https://www.aufaitux.com/blog/neuro-inclusive-ux-design/)

### Autism Design & Accessibility
- [How To Design For Autistic People - Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/design-autism/)
- [Designing User Experiences for People with Autism Spectrum Disorder](https://jscaff.medium.com/designing-user-experiences-for-people-with-autism-spectrum-disorder-c69f826fe922)
- [Designing for Autism in UX - UXPA](https://uxpa.org/designing-for-autism-in-ux/)
- [Sensory-Friendly Design: Creating Digital Spaces for Autistic Users](https://www.accessibility.com/blog/sensory-friendly-design-creating-digital-spaces-that-support-autistic-users)
- [The Ultimate Guide to Autism Friendly Colours](https://www.experia.co.uk/blog/ultimate-guide-to-autism-friendly-colours/)
- [User Interface for People with Autism Spectrum Disorders](https://www.researchgate.net/publication/276495184_User_Interface_for_People_with_Autism_Spectrum_Disorders)

### Neurodivergent Design (Combined)
- [Embracing Neurodiversity in UX Design](https://www.uxmatters.com/mt/archives/2024/04/embracing-neurodiversity-in-ux-design-crafting-inclusive-digital-environments.php)
- [Designing Inclusive and Sensory-Friendly UX](https://uxmag.com/articles/designing-inclusive-and-sensory-friendly-ux-for-neurodiverse-audiences)
- [Designing UX for Neurodiverse Users](https://dool.agency/designing-ux-for-neurodiverse-users/)
- [Neurodiversity in UX: 7 Key Design Principles](https://devqube.com/neurodiversity-in-ux/)
- [Designing for Neurodiversity: Inclusive UX Strategies for 2025](https://medium.com/design-bootcamp/designing-for-neurodiversity-inclusive-ux-strategies-for-2025-51fbd30f1275)

### Gamification & ADHD
- [Effectiveness of Gamified Educational Apps for Children with ADHD](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1668260/full)
- [How Gamification in ADHD Apps Can Boost User Retention](https://imaginovation.net/blog/gamification-adhd-apps-user-retention/)
- [ADHD Gamification and Its Role in Boosting Focus and Learning](https://www.adhdcentre.co.uk/adhd-gamification-and-its-role-in-boosting-focus-and-learning/)
- [Gamified Task Management for ADHD](https://magictask.io/blog/gamified-task-management-adhd-focus-productivity/)
- [Gamified To Do List Apps ADHD Brains Actually Stick With](https://affine.pro/blog/gamified-to-do-list-apps-adhd)

### Gamification & Autism
- [Gamified Environments for Students With Autistic Spectrum Disorder](https://pmc.ncbi.nlm.nih.gov/articles/PMC10173233/)
- [Gamification Attributes for Autism Spectrum Disorder](https://www.tandfonline.com/doi/full/10.1080/10447318.2024.2381928)
- [AI-Driven Gamified Intervention Models for Autism Education](https://dl.acm.org/doi/10.1145/3744464.3744497)
- [Gameful Strategies in Education of Autistic Children](https://link.springer.com/article/10.1186/s40561-024-00309-6)

### Reward Systems & Token Economies
- [Behaviorism and Token Economy for Children with ADHD](https://sites.psu.edu/aspsy/2024/03/25/behaviorism-and-token-economy-for-children-with-adhd/)
- [5 Reward Systems That Motivate Without Bribing ADHD Kids](https://www.monstermath.app/blog/5-reward-systems-that-motivate-without-bribing-adhd-kids)
- [ADHD Reward System for Adults: Evidence-Based Strategies](https://neurolaunch.com/adhd-reward-system-for-adults/)
- [Reward Feedback Mechanism in Virtual Reality Serious Games](https://pmc.ncbi.nlm.nih.gov/articles/PMC11894355/)
- [Proven Reward Systems for ADHD Adults](https://treatmhcalifornia.com/blog/reward-systems-for-adhd-adults/)

### App Case Studies
- [Duolingo Case Study: How Gamification Made Learning Addictive](https://www.youngurbanproject.com/duolingo-case-study/)
- [The Psychology Behind Duolingo's Streak Feature](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)
- [How Duolingo Streak Builds Habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- [Habitica App Review](https://www.choosingtherapy.com/habitica-app-review/)
- [Neurodivergent App Review: Habitica](https://bipolarcoaster.blog/2024/08/31/neurodivergent-app-review-habitica/)
- [Focus Apps for ADHD: Complete Analysis](https://www.brain.fm/blog/focus-apps-for-adhd)

### WCAG & Cognitive Accessibility
- [How WCAG Benefits Everyone: Neurodiversity](https://www.wcag.com/blog/digital-accessibility-and-neurodiversity/)
- [W3C Cognitive Accessibility](https://www.w3.org/WAI/cognitive/)
- [Essential WCAG 2.2 Success Criteria for Neurodiverse Users](https://www.pivotalaccessibility.com/2025/03/essential-wcag-2-2-success-criteria-for-neurodiverse-users/)
- [Cognitive & Learning Disabilities - WCAG Criteria](https://www.accesify.io/blog/cognitive-learning-disabilities-wcag/)

### Typography & Readability
- [Inclusive Typography: Fonts That Support Dyslexia, Low Vision, and ADHD](https://medium.com/@blessingokpala/inclusive-typography-fonts-that-support-dyslexia-low-vision-and-adhd-1f6bc13aff50)
- [Font Principles for Neurodiversity](https://www.neurodiversity.design/principles/font/)
- [Best Fonts for ADHD](https://www.audioeye.com/post/best-fonts-for-adhd/)

### Time Management & Breaks
- [10-3 Rule for ADHD Focus](https://www.globaladhdnetwork.com/post/discover-the-10-3-rule-for-adhd-and-fuel-your-focus)
- [Autism and Focus: The Time Break Theory](https://www.hikiapp.com/hiki-blog/2023/1/24/autism-amp-focus-the-time-break-theory)
- [Visual Timers for Autism](https://www.autismparentingmagazine.com/visual-timer-benefits/)
- [Pomodoro Technique for ADHD](https://psychcentral.com/adhd/how-to-adapt-the-pomodoro-technique-adhd)

### Sensory Design
- [Sensory-Friendly Design for ADHD and Autism](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)
- [Atypical Color Preferences: Creating Autism-Friendly Spaces](https://www.casrf.org/post/atypical-color-preferences-creating-autism-friendly-spaces)
- [Autism-Friendly Colors & Sensory Wall Art](https://www.heyasd.com/blogs/autism/autism-friendly-colors)
