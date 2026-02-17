# User Management — Design Doc
**Date:** 2026-02-17
**Status:** Approved

## Overview

Allow admin users to create, edit, and delete user accounts from within the app, without needing direct database access.

## Scope

Full CRUD for user profiles, accessible to admin role only.

---

## UI Architecture

**Access point:** "Manage Users" button in the Family Dashboard (`/family`), visible to admins only. Opens a slide-in settings panel from the right.

**UserManagementPanel (slide-in):**
- Lists all profiles: avatar icon, name, role badge (admin/parent/child), age group
- "Add User" button at top
- Each row has Edit (pencil) and Delete (trash) buttons
- Delete on own account is disabled (tooltip explanation)
- Delete shows inline confirmation ("Are you sure? [Cancel] [Delete]") — no separate modal

**UserFormModal (overlays everything):**
- Two modes: "Add User" / "Edit User" — same form, different title + submit label
- Closes on backdrop click or X button
- Edit mode pre-fills all fields

---

## Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text input | ✓ | 2–30 chars |
| Icon | Emoji picker grid | ✓ | ~16 curated options, one selected by default |
| Role | Dropdown | ✓ | admin / parent / child |
| Age Group | Dropdown | ✓ | adult / secondary / primary |
| Default Subjects | Multi-select checkboxes | — | From existing subjects; can be empty |
| Linked Parent | Dropdown | ✓ if child | Visible only when role = child; lists existing parent/admin profiles |

PIN is never set or shown by admin. New accounts are created with `pin_hash = NULL`. The existing first-login `/set-pin` flow handles PIN creation automatically when a user logs in for the first time.

---

## API Changes

Three new endpoints, all require `admin` role:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/profiles` | Create new profile |
| `PUT` | `/api/auth/profiles/:id` | Update existing profile |
| `DELETE` | `/api/auth/profiles/:id` | Delete profile + all data |

**Request body (POST/PUT):**
```json
{
  "name": "string",
  "icon": "string (emoji)",
  "role": "admin | parent | child",
  "age_group": "adult | secondary | primary",
  "default_subjects": [1, 2],
  "parent_id": 2
}
```

**Create:** Inserts into `profiles` with `pin_hash = NULL`. Inserts `parent_child` row if `parent_id` provided.

**Update:** Updates `profiles` row. Re-creates `parent_child` row (delete existing + insert new) if `parent_id` provided or changed.

**Delete:** Single DB transaction cascading through all associated data:
- `card_progress`, `card_history`, `profile_stats`
- `profile_xp`, `subject_xp`, `profile_coins`, `coin_transactions`
- `profile_achievements`, `profile_quests`, `profile_reward_state`
- `profile_tokens`, `token_transactions`, `token_test_history`
- `weekly_streaks`
- `parent_child` (as parent or child)
- `test_sessions`, `test_reports`, `learning_profiles`
- `profiles`

Cannot delete own account — enforced both client-side (button disabled) and server-side (403 if `req.user.id === req.params.id`).

---

## Files to Create

- `client/src/components/UserManagementPanel.jsx` — slide-in panel with user list
- `client/src/components/UserFormModal.jsx` — add/edit form modal

## Files to Modify

- `server/routes/auth.js` — add POST, PUT, DELETE profile endpoints
- `server/dal/auth.js` — add `createProfile`, `updateProfile`, `deleteProfile` DAL functions
- `client/src/pages/FamilyDashboard.jsx` — add "Manage Users" button + panel state
