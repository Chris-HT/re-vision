import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Flashcards from './pages/Flashcards';
import Results from './pages/Results';
import DynamicTest from './pages/DynamicTest';

function App() {
  const [profile, setProfile] = useState(null);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;