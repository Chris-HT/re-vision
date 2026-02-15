import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { GamificationProvider } from './context/GamificationContext';
import RewardRenderer from './components/RewardRenderer';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import Flashcards from './pages/Flashcards';
import Results from './pages/Results';
import DynamicTest from './pages/DynamicTest';
import SmartReview from './pages/SmartReview';
import Dashboard from './pages/Dashboard';
import FamilyDashboard from './pages/FamilyDashboard';

function App() {
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('medium');
  const [reduceAnimations, setReduceAnimations] = useState(false);
  const [literalLanguage, setLiteralLanguage] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${savedToken}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(data => {
        setToken(savedToken);
        setProfile(data.profile);
        if (data.profile?.theme) setTheme(data.profile.theme);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('profile');
      })
      .finally(() => setLoading(false));
  }, []);

  // When profile changes, load their preferences
  useEffect(() => {
    if (profile?.theme) setTheme(profile.theme);
    if (profile?.fontSize) setFontSize(profile.fontSize);
    if (profile?.reduceAnimations !== undefined) setReduceAnimations(profile.reduceAnimations);
    if (profile?.literalLanguage !== undefined) setLiteralLanguage(profile.literalLanguage);
  }, [profile]);

  const handleLogin = (newToken, newProfile) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setProfile(newProfile);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('profile');
    setToken(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <ThemeProvider initialTheme={theme} initialFontSize={fontSize} initialReduceAnimations={reduceAnimations} initialLiteralLanguage={literalLanguage}>
        <div
          className="min-h-screen flex items-center justify-center"
          style={{
            background: `linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))`
          }}
        >
          <div style={{ color: 'var(--text-primary)' }} className="text-xl">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  if (!token) {
    return (
      <ThemeProvider initialTheme={theme} initialFontSize={fontSize} initialReduceAnimations={reduceAnimations} initialLiteralLanguage={literalLanguage}>
        <div
          className="min-h-screen"
          style={{
            background: `linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))`
          }}
        >
          <Login onLogin={handleLogin} />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider initialTheme={theme} initialFontSize={fontSize} initialReduceAnimations={reduceAnimations} initialLiteralLanguage={literalLanguage}>
      <GamificationProvider profileId={profile?.id}>
        <Router>
          <div
            className="min-h-screen"
            style={{
              background: `linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))`
            }}
          >
            <Navbar profile={profile} onLogout={handleLogout} />
            <RewardRenderer />
            <Routes>
              <Route
                path="/"
                element={<Home profile={profile} setProfile={setProfile} />}
              />
              <Route
                path="/flashcards"
                element={<Flashcards profile={profile} />}
              />
              <Route
                path="/results"
                element={<Results />}
              />
              <Route
                path="/dynamic-test"
                element={<DynamicTest profile={profile} />}
              />
              <Route
                path="/smart-review"
                element={<SmartReview profile={profile} />}
              />
              <Route
                path="/dashboard"
                element={<Dashboard profile={profile} />}
              />
              <Route
                path="/family"
                element={
                  profile?.role === 'admin' || profile?.role === 'parent'
                    ? <FamilyDashboard profile={profile} />
                    : <Navigate to="/" replace />
                }
              />
            </Routes>
          </div>
        </Router>
      </GamificationProvider>
    </ThemeProvider>
  );
}

export default App;
