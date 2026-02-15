import { useState, useEffect } from 'react';
import PinInput from '../components/PinInput';

export default function Login({ onLogin }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [mode, setMode] = useState(null); // 'login' | 'set-pin'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmPin, setConfirmPin] = useState(null); // for set-pin confirmation

  useEffect(() => {
    fetch('/api/auth/profiles')
      .then(res => res.json())
      .then(data => setProfiles(data.profiles || []))
      .catch(() => setError('Could not load profiles. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectProfile = (profile) => {
    setSelectedProfile(profile);
    setError('');
    setConfirmPin(null);
    setMode(profile.hasPin ? 'login' : 'set-pin');
  };

  const handleBack = () => {
    setSelectedProfile(null);
    setMode(null);
    setError('');
    setConfirmPin(null);
  };

  const handleLogin = async (pin) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedProfile.id, pin })
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMsg = data.error || 'Login failed';
        if (data.attemptsRemaining !== undefined) {
          errorMsg = `Incorrect PIN. ${data.attemptsRemaining} attempt${data.attemptsRemaining !== 1 ? 's' : ''} remaining.`;
        } else if (data.code === 'RATE_LIMIT') {
          errorMsg = 'Too many attempts. Please wait 5 minutes and try again.';
        }
        setError(errorMsg);
        setSubmitting(false);
        return;
      }
      onLogin(data.token, data.profile);
    } catch {
      setError('Could not connect to server. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  const handleSetPin = async (pin) => {
    if (!confirmPin) {
      setConfirmPin(pin);
      setError('');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match. Try again.');
      setConfirmPin(null);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedProfile.id, pin })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to set PIN');
        setConfirmPin(null);
        setSubmitting(false);
        return;
      }
      onLogin(data.token, data.profile);
    } catch {
      setError('Could not connect to server. Check your connection and try again.');
      setConfirmPin(null);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: 'var(--text-primary)' }} className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <span className="text-6xl">&#129504;</span>
            <h1 className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>RE-VISION</h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Who's studying today?
          </p>
        </div>

        {!selectedProfile ? (
          <div className="grid grid-cols-1 gap-4">
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleSelectProfile(profile)}
                className="flex items-center space-x-4 p-5 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <span className="text-4xl">{profile.icon}</span>
                <div className="text-left">
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {profile.ageGroup === 'primary' ? 'Primary' : profile.ageGroup === 'secondary' ? 'Secondary' : 'Adult'}
                  </p>
                </div>
                {!profile.hasPin && (
                  <span className="ml-auto text-xs px-2 py-1 rounded bg-amber-600 text-white">New</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border p-8" style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)' }}>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">{selectedProfile.icon}</span>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {selectedProfile.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'set-pin'
                  ? (confirmPin ? 'Confirm your PIN' : 'Create a 4-digit PIN')
                  : 'Enter your PIN'}
              </p>
            </div>

            <PinInput
              length={4}
              onComplete={mode === 'set-pin' ? handleSetPin : handleLogin}
              error={error}
              disabled={submitting}
            />

            <button
              onClick={handleBack}
              className="mt-6 w-full text-sm py-2 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              Back to profiles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
