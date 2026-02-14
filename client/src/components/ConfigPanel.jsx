import { useState, useEffect } from 'react';

export default function ConfigPanel({ 
  subjects, 
  categories, 
  onConfigChange,
  initialConfig = {} 
}) {
  const [selectedSubject, setSelectedSubject] = useState(initialConfig.subject || '');
  const [selectedTheme, setSelectedTheme] = useState(initialConfig.theme || '');
  const [selectedCategories, setSelectedCategories] = useState(initialConfig.categories || []);
  const [selectedDifficulty, setSelectedDifficulty] = useState(initialConfig.difficulty || 'all');

  // Sync from parent when initialConfig changes (e.g. after wizard completion)
  useEffect(() => {
    if (initialConfig.subject && initialConfig.subject !== selectedSubject) {
      setSelectedSubject(initialConfig.subject);
      setSelectedTheme(initialConfig.theme || '');
      setSelectedCategories([]);
    }
  }, [initialConfig.subject, initialConfig.theme]);

  const currentSubject = subjects?.find(s => s.id === selectedSubject);
  const availableCategories = Object.keys(categories || {});

  useEffect(() => {
    onConfigChange({
      subject: selectedSubject,
      theme: selectedTheme,
      categories: selectedCategories,
      difficulty: selectedDifficulty
    });
  }, [selectedSubject, selectedTheme, selectedCategories, selectedDifficulty]);

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(availableCategories);
  };

  const clearCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Subject
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => {
            setSelectedSubject(e.target.value);
            setSelectedTheme('');
            setSelectedCategories([]);
          }}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a subject...</option>
          {subjects?.map(subject => (
            <option key={subject.id} value={subject.id}>
              {subject.icon} {subject.name}
            </option>
          ))}
        </select>
      </div>

      {currentSubject && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Theme
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Themes</option>
            {currentSubject.themes?.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {availableCategories.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-300">
              Categories
            </label>
            <div className="space-x-2">
              <button
                onClick={selectAllCategories}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Select All
              </button>
              <button
                onClick={clearCategories}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(category => {
              const categoryInfo = categories[category];
              const isSelected = selectedCategories.includes(category);
              
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? `${categoryInfo.bgClass} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Difficulty
        </label>
        <div className="flex space-x-2">
          {['all', '1', '2', '3'].map(level => (
            <button
              key={level}
              onClick={() => setSelectedDifficulty(level)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                selectedDifficulty === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {level === 'all' ? 'All' : `Level ${level}`}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-slate-400">
        {selectedCategories.length > 0 && (
          <p>{selectedCategories.length} categories selected</p>
        )}
      </div>
    </div>
  );
}