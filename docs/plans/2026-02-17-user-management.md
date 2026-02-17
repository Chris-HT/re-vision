# User Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admins to create, edit, and delete user profiles from a slide-in panel in the Family Dashboard.

**Architecture:** Three new admin-only API endpoints (`POST/PUT/DELETE /api/auth/profiles`) backed by DAL functions. On the client, a `UserManagementPanel` slide-in lists all profiles; Add/Edit opens a `UserFormModal` overlay. New accounts are created with `pin_hash = NULL`; the existing Login.jsx `set-pin` flow handles first login automatically (already detects `hasPin: false` and switches to PIN-creation mode).

**Tech Stack:** Express.js + better-sqlite3 (server), React 18 + Tailwind CSS (client), CSS variables for theming.

---

## Task 1: DAL — createProfile, updateProfile, deleteProfile

**Files:**
- Modify: `server/dal/auth.js`

### Step 1: Add `getAllProfiles` function

Append to `server/dal/auth.js`:

```js
export function getAllProfiles() {
  return db.prepare(
    'SELECT id, name, icon, age_group, role, pin_hash FROM profiles ORDER BY id'
  ).all();
}
```

### Step 2: Add `createProfile` function

```js
export function createProfile({ name, icon, role, age_group, default_subjects, parent_id }) {
  const insert = db.prepare(
    `INSERT INTO profiles (name, icon, age_group, role, default_subjects, theme, font_size)
     VALUES (?, ?, ?, ?, ?, 'dark', 'medium')`
  );
  const result = insert.run(
    name,
    icon,
    age_group,
    role,
    JSON.stringify(default_subjects || [])
  );
  const newId = result.lastInsertRowid;

  if (parent_id && role === 'child') {
    db.prepare('INSERT OR IGNORE INTO parent_child (parent_id, child_id) VALUES (?, ?)').run(parent_id, newId);
  }

  return newId;
}
```

### Step 3: Add `updateProfile` function

```js
export function updateProfile(id, { name, icon, role, age_group, default_subjects, parent_id }) {
  db.prepare(
    `UPDATE profiles SET name = ?, icon = ?, age_group = ?, role = ?, default_subjects = ? WHERE id = ?`
  ).run(name, icon, age_group, role, JSON.stringify(default_subjects || []), id);

  // Re-create parent link
  db.prepare('DELETE FROM parent_child WHERE child_id = ?').run(id);
  if (parent_id && role === 'child') {
    db.prepare('INSERT INTO parent_child (parent_id, child_id) VALUES (?, ?)').run(parent_id, id);
  }
}
```

### Step 4: Add `deleteProfile` function

This must cascade all user data in a single transaction:

```js
export function deleteProfile(id) {
  const cascade = db.transaction((profileId) => {
    const tables = [
      'card_progress', 'card_history', 'profile_stats',
      'profile_xp', 'subject_xp', 'profile_coins', 'coin_transactions',
      'profile_achievements', 'profile_quests', 'profile_reward_state',
      'profile_tokens', 'token_transactions', 'token_test_history',
      'weekly_streaks', 'test_sessions', 'test_reports', 'learning_profiles'
    ];
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table} WHERE profile_id = ?`).run(profileId);
    }
    // parent_child: remove as either parent or child
    db.prepare('DELETE FROM parent_child WHERE parent_id = ? OR child_id = ?').run(profileId, profileId);
    db.prepare('DELETE FROM profiles WHERE id = ?').run(profileId);
  });
  cascade(id);
}
```

### Step 5: Commit

```bash
git add server/dal/auth.js
git commit -m "feat: add createProfile, updateProfile, deleteProfile DAL functions"
```

---

## Task 2: API routes — POST, PUT, DELETE /api/auth/profiles

**Files:**
- Modify: `server/routes/auth.js`

### Step 1: Import new DAL functions

At the top of `server/routes/auth.js`, update the import:

```js
import {
  getProfileForLogin, setPin, getLoginProfiles, getChildren,
  getAllProfiles, createProfile, updateProfile, deleteProfile
} from '../dal/auth.js';
```

### Step 2: Add GET /api/auth/profiles/all — list all profiles (admin only)

Add after the existing `GET /profiles` route:

```js
// GET /api/auth/profiles/all — admin: list all profiles
router.get('/profiles/all', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const profiles = getAllProfiles().map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      ageGroup: p.age_group,
      role: p.role,
      hasPin: !!p.pin_hash
    }));
    res.json({ profiles });
  } catch (error) {
    next(error);
  }
});
```

### Step 3: Add POST /api/auth/profiles — create profile (admin only)

```js
// POST /api/auth/profiles — admin: create new profile
router.post('/profiles', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const { name, icon, role, age_group, default_subjects, parent_id } = req.body;
    if (!name || !icon || !role || !age_group) {
      return res.status(400).json({ error: 'name, icon, role, and age_group are required' });
    }
    if (name.length < 2 || name.length > 30) {
      return res.status(400).json({ error: 'Name must be 2–30 characters' });
    }
    if (!['admin', 'parent', 'child'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!['adult', 'secondary', 'primary'].includes(age_group)) {
      return res.status(400).json({ error: 'Invalid age_group' });
    }
    if (role === 'child' && !parent_id) {
      return res.status(400).json({ error: 'parent_id is required for child accounts' });
    }
    const newId = createProfile({ name, icon, role, age_group, default_subjects, parent_id });
    res.status(201).json({ id: newId });
  } catch (error) {
    next(error);
  }
});
```

### Step 4: Add PUT /api/auth/profiles/:id — update profile (admin only)

```js
// PUT /api/auth/profiles/:id — admin: update profile
router.put('/profiles/:id', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, icon, role, age_group, default_subjects, parent_id } = req.body;
    if (!name || !icon || !role || !age_group) {
      return res.status(400).json({ error: 'name, icon, role, and age_group are required' });
    }
    if (name.length < 2 || name.length > 30) {
      return res.status(400).json({ error: 'Name must be 2–30 characters' });
    }
    if (!['admin', 'parent', 'child'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!['adult', 'secondary', 'primary'].includes(age_group)) {
      return res.status(400).json({ error: 'Invalid age_group' });
    }
    if (role === 'child' && !parent_id) {
      return res.status(400).json({ error: 'parent_id is required for child accounts' });
    }
    const existing = getProfileForLogin(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });
    updateProfile(id, { name, icon, role, age_group, default_subjects, parent_id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
```

### Step 5: Add DELETE /api/auth/profiles/:id — delete profile (admin only)

```js
// DELETE /api/auth/profiles/:id — admin: delete profile + all data
router.delete('/profiles/:id', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.profileId) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }
    const existing = getProfileForLogin(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });
    deleteProfile(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
```

### Step 6: Commit

```bash
git add server/routes/auth.js
git commit -m "feat: add admin CRUD endpoints for profile management"
```

---

## Task 3: UserFormModal component

**Files:**
- Create: `client/src/components/UserFormModal.jsx`

The modal is a full-screen overlay (fixed inset-0 backdrop) containing a centred form card.

```jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const ICONS = ['🧑', '👩', '👨', '🧒', '👦', '👧', '🧑‍💻', '👩‍🎓', '👨‍🎓', '🦊', '🐼', '🦁', '🐸', '🐧', '🦋', '⭐'];

export default function UserFormModal({ mode, profile, allProfiles, subjects, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [name, setName] = useState(isEdit ? profile.name : '');
  const [icon, setIcon] = useState(isEdit ? profile.icon : ICONS[0]);
  const [role, setRole] = useState(isEdit ? profile.role : 'child');
  const [ageGroup, setAgeGroup] = useState(isEdit ? profile.ageGroup : 'secondary');
  const [defaultSubjects, setDefaultSubjects] = useState(
    isEdit ? (profile.defaultSubjects || []) : []
  );
  const [parentId, setParentId] = useState(isEdit ? (profile.parentId || '') : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const potentialParents = allProfiles.filter(p => p.role === 'parent' || p.role === 'admin');

  const toggleSubject = (id) => {
    setDefaultSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2 || name.trim().length > 30) {
      setError('Name must be 2–30 characters');
      return;
    }
    if (role === 'child' && !parentId) {
      setError('Please select a parent for this child account');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        icon,
        role,
        age_group: ageGroup,
        default_subjects: defaultSubjects,
        parent_id: role === 'child' ? parseInt(parentId) : null
      };
      const url = isEdit ? `/api/auth/profiles/${profile.id}` : '/api/auth/profiles';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError('Could not connect to server');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit User' : 'Add User'}
          </h2>
          <button onClick={onClose} className="p-1 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              placeholder="Enter name"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-xl p-1.5 rounded-lg transition-colors ${icon === emoji ? 'ring-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: icon === emoji ? 'var(--bg-secondary)' : 'var(--bg-input)' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Age group */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Age Group</label>
            <select
              value={ageGroup}
              onChange={e => setAgeGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="primary">Primary (KS1/KS2)</option>
              <option value="secondary">Secondary (KS3/KS4/GCSE)</option>
              <option value="adult">Adult (Certifications)</option>
            </select>
          </div>

          {/* Linked parent — only for child role */}
          {role === 'child' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Linked Parent</label>
              <select
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                required
              >
                <option value="">Select a parent...</option>
                {potentialParents.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name} ({p.role})</option>
                ))}
              </select>
            </div>
          )}

          {/* Default subjects */}
          {subjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Default Subjects <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <div className="space-y-1.5">
                {subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={defaultSubjects.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {s.icon} {s.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Commit

```bash
git add client/src/components/UserFormModal.jsx
git commit -m "feat: add UserFormModal for creating and editing user profiles"
```

---

## Task 4: UserManagementPanel component

**Files:**
- Create: `client/src/components/UserManagementPanel.jsx`

This is a slide-in panel (fixed right-side drawer) listing all profiles with Add/Edit/Delete controls.

```jsx
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import UserFormModal from './UserFormModal';

const ROLE_COLOURS = {
  admin: 'bg-purple-600',
  parent: 'bg-blue-600',
  child: 'bg-green-600'
};

export default function UserManagementPanel({ currentProfileId, onClose }) {
  const [profiles, setProfiles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', profile }
  const [confirmDelete, setConfirmDelete] = useState(null); // profileId
  const panelRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [profilesRes, subjectsRes] = await Promise.all([
        apiFetch('/api/auth/profiles/all'),
        apiFetch('/api/subjects')
      ]);
      if (profilesRes.ok) {
        const data = await profilesRes.json();
        setProfiles(data.profiles || []);
      }
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !document.querySelector('[data-modal]')?.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/auth/profiles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProfiles(prev => prev.filter(p => p.id !== id));
      }
    } catch { /* ignore */ }
    setConfirmDelete(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full z-40 w-80 shadow-2xl border-l flex flex-col"
        style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Manage Users</h2>
          <button onClick={onClose} className="p-1 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add button */}
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            + Add User
          </button>
        </div>

        {/* Profile list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No profiles found.</p>
          ) : profiles.map(p => (
            <div
              key={p.id}
              className="rounded-lg border p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
            >
              {confirmDelete === p.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>Delete {p.name}?</span>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-2 py-1 text-xs rounded transition-colors"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded text-white ${ROLE_COLOURS[p.role] || 'bg-slate-600'}`}>
                        {p.role}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.ageGroup}</span>
                      {!p.hasPin && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-600 text-white">No PIN</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Edit */}
                    <button
                      onClick={() => setModal({ mode: 'edit', profile: p })}
                      className="p-1.5 rounded hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Edit user"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => p.id !== currentProfileId && setConfirmDelete(p.id)}
                      disabled={p.id === currentProfileId}
                      className="p-1.5 rounded hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: 'var(--text-secondary)' }}
                      title={p.id === currentProfileId ? "You can't delete your own account" : "Delete user"}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div data-modal>
          <UserFormModal
            mode={modal.mode}
            profile={modal.profile}
            allProfiles={profiles}
            subjects={subjects}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); }}
          />
        </div>
      )}
    </>
  );
}
```

### Commit

```bash
git add client/src/components/UserManagementPanel.jsx
git commit -m "feat: add UserManagementPanel slide-in for user list"
```

---

## Task 5: Wire into FamilyDashboard

**Files:**
- Modify: `client/src/pages/FamilyDashboard.jsx`

### Step 1: Add import at top of file

```js
import UserManagementPanel from '../components/UserManagementPanel';
```

### Step 2: Add state for panel visibility

In the component, alongside existing state declarations, add:

```js
const [showUserMgmt, setShowUserMgmt] = useState(false);
```

### Step 3: Add "Manage Users" button in the header

Replace the existing header block (the `<div className="mb-8">` section) with:

```jsx
<div className="mb-8 flex items-start justify-between">
  <div>
    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Family Dashboard</h1>
    <p style={{ color: 'var(--text-secondary)' }}>Monitor your children's learning progress</p>
  </div>
  {profile.role === 'admin' && (
    <button
      onClick={() => setShowUserMgmt(true)}
      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      Manage Users
    </button>
  )}
</div>
```

### Step 4: Render the panel at the bottom of the return

Just before the closing `</div>` of the component's outermost return wrapper, add:

```jsx
{showUserMgmt && (
  <UserManagementPanel
    currentProfileId={profile.id}
    onClose={() => setShowUserMgmt(false)}
  />
)}
```

### Step 5: Commit

```bash
git add client/src/pages/FamilyDashboard.jsx
git commit -m "feat: add Manage Users button and panel to FamilyDashboard"
```

---

## Task 6: Manual smoke test

Start the dev server and verify:

```bash
npm run dev
```

**Checklist:**
- [ ] Log in as admin, navigate to `/family`
- [ ] "Manage Users" button is visible; parent/child roles do NOT see it
- [ ] Panel slides in showing all profiles with role badges
- [ ] New profile without PIN shows "No PIN" badge
- [ ] Click "Add User" → modal opens
- [ ] Create a child account → select parent, icon, age group → submit
- [ ] New profile appears in list with "No PIN" badge
- [ ] Log out, select new profile on login screen → "New" badge shown → prompted to set PIN → PIN set → logged in
- [ ] Back in panel: edit a profile → changes saved → list updates
- [ ] Delete a non-self profile → inline confirmation → profile removed from list
- [ ] Delete button on own account is greyed out with tooltip
- [ ] Delete button sends 403 from server if own account ID is sent directly

### Final commit (if any manual fixes needed)

```bash
git add -A
git commit -m "fix: user management smoke test fixes"
```
