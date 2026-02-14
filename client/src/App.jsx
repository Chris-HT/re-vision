import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Flashcards from './pages/Flashcards';
import Results from './pages/Results';
import DynamicTest from './pages/DynamicTest';
import SmartReview from './pages/SmartReview';
import Dashboard from './pages/Dashboard';

function App() {
  const [profile, setProfile] = useState(null);
  const [theme, setTheme] = useState('dark');

  // When profile changes, load their theme preference
  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme);
    }
  }, [profile]);

  return (
    <ThemeProvider initialTheme={theme}>
      <Router>
        <div
          className="min-h-screen"
          style={{
            background: `linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))`
          }}
        >
          <Navbar profile={profile} />
          <Routes>
            <Route
              path="/"
              element={<Home onSelectProfile={setProfile} />}
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
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
