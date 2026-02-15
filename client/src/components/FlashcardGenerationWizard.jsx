import { useState } from 'react';
import { apiFetch } from '../utils/api';
import ColorPresets from './ColorPresets';

const EMOJI_GRID = [
  '📚', '📐', '🔬', '🧪', '🌍', '🧮',
  '💻', '📊', '🎨', '🎵', '🏛️', '📖',
  '🧬', '⚡', '🔢', '🌱',
];

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export default function FlashcardGenerationWizard({ profile, subjects, onComplete, onClose }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(null); // 'new' | 'existing'
  const [subject, setSubject] = useState({
    name: '', icon: '📚', description: '', ageGroup: profile?.ageGroup || 'adult'
  });
  const [existingSubjectId, setExistingSubjectId] = useState('');
  const [themeMode, setThemeMode] = useState('new'); // 'new' | 'existing'
  const [theme, setTheme] = useState({ name: '', color: 'from-blue-500 to-cyan-500' });
  const [existingThemeId, setExistingThemeId] = useState('');
  const [generation, setGeneration] = useState({
    topic: '', count: 10, difficulty: 'medium', additionalContext: ''
  });
  const [generatedCards, setGeneratedCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedExistingSubject = subjects?.find(s => s.id === existingSubjectId);

  const canProceedStep2 = () => {
    if (mode === 'new') {
      return subject.name.trim() && theme.name.trim();
    }
    if (mode === 'existing') {
      if (!existingSubjectId) return false;
      if (themeMode === 'new') return theme.name.trim();
      return !!existingThemeId;
    }
    return false;
  };

  const canProceedStep3 = () => generation.topic.trim();

  const getSubjectId = () => {
    if (mode === 'existing') return existingSubjectId;
    return slugify(subject.name);
  };

  const getThemeId = () => {
    if (mode === 'existing' && themeMode === 'existing') return existingThemeId;
    return slugify(theme.name);
  };

  const getAgeGroup = () => {
    if (mode === 'existing' && selectedExistingSubject) {
      return selectedExistingSubject.ageGroup || profile?.ageGroup || 'adult';
    }
    return subject.ageGroup;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: generation.topic,
          ageGroup: getAgeGroup(),
          difficulty: generation.difficulty,
          count: generation.count,
          format: 'flashcard',
          additionalContext: generation.additionalContext
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.userMessage || data.error || 'Generation failed');
        return;
      }
      setGeneratedCards(data.questions || []);
      setStep(4);
    } catch (err) {
      setError('Failed to connect to server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = (index) => {
    setGeneratedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditCard = (index, field, value) => {
    setGeneratedCards(prev => prev.map((card, i) =>
      i === index ? { ...card, [field]: value } : card
    ));
  };

  const handleSave = async () => {
    if (generatedCards.length === 0) return;
    setLoading(true);
    setError(null);

    const subjectId = getSubjectId();
    const themeId = getThemeId();

    const body = {
      subjectId,
      themeId,
      questions: generatedCards,
    };

    if (mode === 'new') {
      body.subjectMetadata = {
        name: subject.name.trim(),
        icon: subject.icon,
        description: subject.description.trim() || `${subject.name} flashcards`,
        ageGroup: subject.ageGroup
      };
    }

    if (mode === 'new' || (mode === 'existing' && themeMode === 'new')) {
      body.themeMetadata = {
        name: theme.name.trim(),
        color: theme.color
      };
    }

    try {
      const res = await apiFetch('/api/generate/save', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Save failed');
        return;
      }
      onComplete(subjectId, themeId);
    } catch (err) {
      setError('Failed to save. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Generate Flashcards</h2>
            <p className="text-sm text-slate-400">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-blue-500' : 'bg-slate-700'
              }`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Choose Mode */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-300 mb-6">How would you like to add flashcards?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setMode('new'); setStep(2); }}
                  className="p-6 rounded-xl border-2 border-slate-600 hover:border-blue-500 bg-slate-700/50 hover:bg-slate-700 transition-all text-left group"
                >
                  <div className="text-3xl mb-3">✨</div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">New Subject</h3>
                  <p className="text-sm text-slate-400 mt-1">Create a brand new subject with its first set of cards</p>
                </button>
                <button
                  onClick={() => { setMode('existing'); setStep(2); }}
                  className="p-6 rounded-xl border-2 border-slate-600 hover:border-purple-500 bg-slate-700/50 hover:bg-slate-700 transition-all text-left group"
                >
                  <div className="text-3xl mb-3">📂</div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">Existing Subject</h3>
                  <p className="text-sm text-slate-400 mt-1">Add cards to a subject you already have</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure Subject & Theme */}
          {step === 2 && mode === 'new' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={subject.name}
                  onChange={e => setSubject(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. GCSE Maths, Spanish, Science"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Icon</label>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_GRID.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setSubject(s => ({ ...s, icon: emoji }))}
                      className={`text-2xl p-2 rounded-lg transition-all ${
                        subject.icon === emoji
                          ? 'bg-blue-600 ring-2 ring-blue-400'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={subject.description}
                  onChange={e => setSubject(s => ({ ...s, description: e.target.value }))}
                  placeholder="e.g. Year 10 Maths revision"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Age Group</label>
                <div className="flex gap-2">
                  {[
                    { value: 'primary', label: 'Primary' },
                    { value: 'secondary', label: 'Secondary' },
                    { value: 'adult', label: 'Adult' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSubject(s => ({ ...s, ageGroup: opt.value }))}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                        subject.ageGroup === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-700" />

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Theme Name</label>
                <input
                  type="text"
                  value={theme.name}
                  onChange={e => setTheme(t => ({ ...t, name: e.target.value }))}
                  placeholder="e.g. Algebra, Vocabulary, Forces"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Theme Colour</label>
                <ColorPresets selected={theme.color} onSelect={c => setTheme(t => ({ ...t, color: c }))} />
              </div>
            </div>
          )}

          {step === 2 && mode === 'existing' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
                <select
                  value={existingSubjectId}
                  onChange={e => { setExistingSubjectId(e.target.value); setExistingThemeId(''); }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a subject...</option>
                  {subjects?.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>

              {selectedExistingSubject && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Theme</label>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setThemeMode('new')}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                          themeMode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        New Theme
                      </button>
                      <button
                        onClick={() => setThemeMode('existing')}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                          themeMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Existing Theme
                      </button>
                    </div>

                    {themeMode === 'existing' && (
                      <select
                        value={existingThemeId}
                        onChange={e => setExistingThemeId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a theme...</option>
                        {selectedExistingSubject.themes?.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}

                    {themeMode === 'new' && (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={theme.name}
                          onChange={e => setTheme(t => ({ ...t, name: e.target.value }))}
                          placeholder="e.g. Algebra, Vocabulary, Forces"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Theme Colour</label>
                          <ColorPresets selected={theme.color} onSelect={c => setTheme(t => ({ ...t, color: c }))} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Configure Generation */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Topic</label>
                <input
                  type="text"
                  value={generation.topic}
                  onChange={e => setGeneration(g => ({ ...g, topic: e.target.value }))}
                  placeholder="e.g. Quadratic equations, French animals, Photosynthesis"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Additional Context (optional)</label>
                <textarea
                  value={generation.additionalContext}
                  onChange={e => setGeneration(g => ({ ...g, additionalContext: e.target.value }))}
                  placeholder="e.g. Focus on solving by factoring, include worked examples in answers"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Cards: <span className="text-white font-bold">{generation.count}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={generation.count}
                  onChange={e => setGeneration(g => ({ ...g, count: parseInt(e.target.value) }))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5</span>
                  <span>20</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGeneration(g => ({ ...g, difficulty: opt.value }))}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                        generation.difficulty === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canProceedStep3() || loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Cards'
                )}
              </button>
            </div>
          )}

          {/* Step 4: Preview & Save */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-300">
                  {generatedCards.length} card{generatedCards.length !== 1 ? 's' : ''} generated
                </p>
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Regenerate
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {generatedCards.map((card, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-300">
                        {card.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">
                          Diff {card.difficulty}
                        </span>
                        <button
                          onClick={() => handleDeleteCard(index)}
                          className="text-slate-500 hover:text-red-400 text-lg leading-none ml-2"
                          title="Remove card"
                        >
                          &times;
                        </button>
                      </div>
                    </div>

                    {editingCard === index ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-slate-400">Question</label>
                          <input
                            type="text"
                            value={card.question}
                            onChange={e => handleEditCard(index, 'question', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Answer</label>
                          <textarea
                            value={card.answer}
                            onChange={e => handleEditCard(index, 'answer', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <button
                          onClick={() => setEditingCard(null)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Done editing
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingCard(index)}
                        className="cursor-pointer hover:bg-slate-700/50 rounded p-1 -m-1 transition-colors"
                        title="Click to edit"
                      >
                        <p className="text-white text-sm font-medium">{card.question}</p>
                        <p className="text-slate-400 text-sm mt-1">{card.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {generatedCards.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p>All cards removed. Go back to regenerate.</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={generatedCards.length === 0 || loading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  `Save ${generatedCards.length} Cards to Bank`
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-6 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium rounded-lg transition-all"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
