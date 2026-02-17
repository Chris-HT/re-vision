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
        parent_id: role === 'child' ? parentId : null
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
