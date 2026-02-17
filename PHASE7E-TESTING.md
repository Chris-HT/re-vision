# Phase 7e Testing Regime

## 1. Database & Startup
- [ ] Delete `data/revision.db` and run `npm run migrate` then `npm run dev` — server starts without errors
- [ ] Check server logs for no warnings about quest tables or ALTER statements
- [ ] Verify quest definitions seeded: open DB with any SQLite tool and confirm 8 rows in `quest_definitions` (6 daily, 2 weekly)

## 2. Quest System

### Daily quests
- [ ] Log in as any profile, go to Dashboard — QuestTracker section appears with 3 daily quests
- [ ] Refresh page — same 3 quests shown (not re-randomised)
- [ ] Review flashcards — `cards_reviewed` and `correct_answers` quest progress increments (check Dashboard after a few cards)
- [ ] Complete a quest (e.g. "Answer 5 questions correctly") — shows checkmark, progress bar fills to 100%, "Complete!" label appears
- [ ] Completed quest rewards (XP + coins) should be included in the card review response (check Network tab for `questCompleted` in response)

### Weekly quest
- [ ] QuestTracker shows 1 weekly mission below daily quests
- [ ] Complete a dynamic test — `tests_completed` quest progress increments
- [ ] Score 80%+ on a test — `score_above_80` quest increments

### Quest reset
- [ ] To simulate next day: manually update `assigned_date` in `profile_quests` to yesterday's date via SQLite, then refresh Dashboard — 3 new daily quests assigned (old ones gone)

## 3. Variable Rewards

### Lucky questions
- [ ] Go to Flashcards, start a session with 20+ cards
- [ ] Roughly 1 in 20 cards should show a golden "Lucky! 2x Coins" badge in the header
- [ ] Answer a lucky question correctly — coin reward popup shows double ("+10 coins (Lucky 2x!)" instead of "+5 coins")
- [ ] Start a Dynamic Test with 10+ questions — roughly 0-1 should show "Lucky! 2x Coins"

### Daily bonus
- [ ] Log in fresh (or delete `profile_reward_state` row) — first XP award of the session shows "+X XP (Daily Bonus! 2x)" with doubled amount
- [ ] Subsequent XP awards in the same session show normal amounts
- [ ] Refresh page — daily bonus does NOT re-trigger (already used today)

### Comeback bonus
- [ ] Manually set `last_session_date` in `profile_reward_state` to 4 days ago
- [ ] Reload page — should see "+50 coins Welcome Back! (4 days away)" popup
- [ ] Verify coin counter increased by 50

### Opt-out
- [ ] Open Preferences (gear icon) — "Variable rewards" toggle is visible and ON by default
- [ ] Toggle OFF — reload page
- [ ] Start flashcard session — no lucky question badges appear
- [ ] No daily bonus or comeback bonus triggers
- [ ] Toggle back ON — lucky questions reappear

## 4. Progressive Disclosure

### Child/secondary profile (level 1)
- [ ] Log in as a child profile at level 1
- [ ] Dashboard shows StatsCards but NO QuestTracker and NO Achievements sections
- [ ] Preferences panel — variable rewards toggle should be hidden (if below level 3)

### Simulate level 3
- [ ] Manually set `level = 3` in `profile_xp` table for the child profile
- [ ] Refresh Dashboard — QuestTracker now appears
- [ ] Variable rewards toggle now visible in Preferences

### Simulate level 5
- [ ] Set `level = 5` in `profile_xp`
- [ ] Refresh Dashboard — Achievements section now appears

### Unlock notifications
- [ ] Set level back to 2, set `total_xp` just below level 3 threshold (e.g. 240 out of 250)
- [ ] Do a few flashcard reviews to trigger level-up to 3
- [ ] Should see "Quests Unlocked!" notification after level-up modal
- [ ] Repeat for level 4->5: should see "Achievements & Streaks Unlocked!"

### Adult profile
- [ ] Log in as the admin/adult profile at any level (even level 1)
- [ ] Dashboard shows QuestTracker AND Achievements — no gating
- [ ] Variable rewards toggle always visible in Preferences

## 5. Step Indicators

### Dynamic Test
- [ ] Go to Dynamic Test — step indicator shows "Configure" highlighted (step 1 of 4)
- [ ] Generate a test — indicator shows "Preview" highlighted (step 2)
- [ ] Click Start — indicator shows "Test" highlighted (step 3)
- [ ] Complete all questions — indicator shows "Results" highlighted (step 4)
- [ ] Previous steps show green checkmarks

### Flashcards
- [ ] Go to Flashcards — no step indicator on config screen (it's the Select step)
- [ ] Click Start Session — Preview step shows indicator at step 2
- [ ] Confirm start — Study step shows indicator at step 3
- [ ] Complete all cards — Results step shows indicator at step 4

### Smart Review
- [ ] Go to Smart Review — Select step (no indicator on landing)
- [ ] Click Start Review — Preview step shows indicator at step 2
- [ ] Confirm — Review step at step 3
- [ ] Complete — Results step at step 4

## 6. Preferences Persistence
- [ ] Toggle variable rewards OFF in Preferences
- [ ] Log out and log back in — variable rewards toggle still OFF
- [ ] Toggle ON — refresh page — still ON

## 7. Cross-cutting Checks
- [ ] Light theme: all new UI (QuestTracker, StepIndicator, lucky badge) renders correctly with light backgrounds
- [ ] High contrast theme: same check
- [ ] Mobile: hamburger menu still works, QuestTracker renders in single column, step indicators wrap gracefully on narrow screens
- [ ] Focus mode: lucky question badges still show (they're informational), reward popups still suppressed for XP/coins
- [ ] `npm run build` — no errors or new warnings

## 8. Edge Cases
- [ ] Profile with no card reviews and no tests — QuestTracker shows all quests at 0 progress
- [ ] Complete all 3 daily quests + weekly quest — all show checkmarks, no errors
- [ ] Very fast card reviews (spam clicking) — quest progress doesn't over-count (check DB)
- [ ] New profile (never logged in) — reward state initialised correctly, no comeback bonus on first login (no `lastSessionDate`)
