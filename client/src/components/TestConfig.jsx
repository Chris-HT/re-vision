import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const SESSION_PRESETS = {
  primary: { quick: 5, standard: 8, extended: 12 },
  secondary: { quick: 8, standard: 10, extended: 15 },
  adult: { quick: 10, standard: 15, extended: 20 }
};

export default function TestConfig({ profile, onStartTest, previousTests, literalLanguage }) {
  const ageGroup = profile?.ageGroup || 'adult';
  const presets = SESSION_PRESETS[ageGroup] || SESSION_PRESETS.adult;
  const defaultPreset = profile?.sessionPreset || 'standard';
  const defaultCount = presets[defaultPreset] || presets.standard;

  const [formData, setFormData] = useState({
    topic: '',
    additionalContext: '',
    format: 'mix',
    count: defaultCount,
    difficulty: ageGroup === 'primary' ? 'easy' : ageGroup === 'secondary' ? 'medium' : 'hard'
  });
  const [activePreset, setActivePreset] = useState(defaultPreset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [learningProfile, setLearningProfile] = useState(null);

  useEffect(() => {
    if (profile?.id) {
      apiFetch(`/api/learning-profile/${profile.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setLearningProfile(data); })
        .catch(() => {});
    }
  }, [profile?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Enrich additionalContext with learning profile weak areas
      let enrichedContext = formData.additionalContext || '';
      if (learningProfile?.weakAreas?.length > 0) {
        const weakAreasList = learningProfile.weakAreas.map(w => w.area).join(', ');
        const profileHint = `This student has previously struggled with: ${weakAreasList}. Please include some questions targeting these weak areas.`;
        enrichedContext = enrichedContext
          ? `${enrichedContext}\n${profileHint}`
          : profileHint;
      }

      const response = await apiFetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          additionalContext: enrichedContext,
          ageGroup: profile.ageGroup,
          literalLanguage: !!literalLanguage
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.userMessage || data.error || 'Failed to generate questions');
      }

      setLoading(false);
      onStartTest(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLoadPrevious = async (cacheKey) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/generated/${cacheKey}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to load test');
      }

      setLoading(false);
      onStartTest(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const costEstimate = () => {
    const minCost = (formData.count * 0.001).toFixed(3);
    const maxCost = (formData.count * 0.003).toFixed(3);
    return `$${minCost} - $${maxCost}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Configure Your Test</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Topic
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g. Photosynthesis, World War 2, Fractions..."
              className="w-full px-4 py-2 border rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Additional Context (optional)
            </label>
            <textarea
              value={formData.additionalContext}
              onChange={(e) => setFormData({ ...formData, additionalContext: e.target.value })}
              placeholder="e.g. Focus on the light reactions, Year 8 level..."
              className="w-full px-4 py-2 border rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              rows="2"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'multiple_choice', label: 'Multiple Choice' },
                { value: 'free_text', label: 'Free Text' },
                { value: 'mix', label: 'Mixed' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, format: option.value })}
                  disabled={loading}
                  className={`py-2 px-4 rounded-md font-medium transition-all ${
                    formData.format === option.value
                      ? 'bg-blue-600 text-white'
                      : ''
                  }`}
                  style={formData.format !== option.value ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' } : undefined}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Number of Questions: {formData.count}
            </label>
            <div className="flex gap-2 mb-3">
              {Object.entries(presets).map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setActivePreset(key);
                    setFormData({ ...formData, count });
                  }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    activePreset === key ? 'bg-blue-600 text-white' : ''
                  }`}
                  style={activePreset !== key ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' } : undefined}
                >
                  <span className="capitalize">{key}</span> ({count})
                  <span className="block text-xs opacity-75">~{Math.round(count * 1.5)} min</span>
                </button>
              ))}
            </div>
            <input
              type="range"
              min="5"
              max="20"
              value={formData.count}
              onChange={(e) => {
                setActivePreset(null);
                setFormData({ ...formData, count: parseInt(e.target.value) });
              }}
              disabled={loading}
              className="w-full"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['easy', 'medium', 'hard'].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, difficulty: level })}
                  disabled={loading}
                  className={`py-2 px-4 rounded-md font-medium transition-all capitalize ${
                    formData.difficulty === level
                      ? 'bg-green-600 text-white'
                      : ''
                  }`}
                  style={formData.difficulty !== level ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' } : undefined}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-input)' }}>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Cost:</span>
              <span className="text-lg font-semibold text-green-400">
                {costEstimate()}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Using Claude Sonnet model
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !formData.topic}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all"
          >
            {loading ? `Generating ${formData.count} questions...` : 'Generate Questions'}
          </button>
        </form>
      </div>

      {previousTests && previousTests.length > 0 && (
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Previous Tests</h3>
            <button
              onClick={() => setShowPrevious(!showPrevious)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showPrevious ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPrevious && (
            <div className="space-y-2">
              {previousTests.slice(0, 10).map((test, index) => (
                <button
                  key={test.cacheKey}
                  onClick={() => handleLoadPrevious(test.cacheKey)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-input)' }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{test.topic}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {test.count} questions • {test.format} • {test.difficulty}
                      </p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(test.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}