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
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', profile }
  const [confirmDelete, setConfirmDelete] = useState(null); // profileId
  const panelRef = useRef(null);

  const load = async () => {
    setLoadError('');
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
    } catch {
      setLoadError('Could not load profiles. Check your connection.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/auth/profiles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProfiles(prev => prev.filter(p => p.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete profile');
      }
    } catch {
      alert('Could not connect to server');
    }
    setConfirmDelete(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />

      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full z-40 w-80 shadow-2xl border-l flex flex-col"
        style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Manage Users</h2>
          <button onClick={onClose} className="p-1 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            + Add User
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : loadError ? (
            <p className="text-sm text-center py-8 text-red-400">{loadError}</p>
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

      {modal && (
        <UserFormModal
          mode={modal.mode}
          profile={modal.profile}
          allProfiles={profiles}
          subjects={subjects}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
