import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import TestConfig from '../components/TestConfig';
import TestQuestion from '../components/TestQuestion';
import TestResults from '../components/TestResults';

export default function DynamicTest({ profile }) {
  const navigate = useNavigate();
  const { literalLanguage } = useTheme();
  const gam = useGamification();
  const [testState, setTestState] = useState('config'); // config, testing, results
  const [testData, setTestData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [previousTests, setPreviousTests] = useState([]);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  useEffect(() => {
    if (!profile) {
      navigate('/');
      return;
    }

    // Check API configuration and fetch previous tests
    const initialize = async () => {
      try {
        const [healthResponse, testsResponse] = await Promise.all([
          fetch('/api/health'),
          apiFetch('/api/generated')
        ]);

        const health = await healthResponse.json();
        setApiConfigured(health.claudeApiConfigured);

        if (testsResponse.ok) {
          const tests = await testsResponse.json();
          setPreviousTests(tests.generations || []);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [profile, navigate]);

  const handleStartTest = (data) => {
    setTestData(data);
    setTestState('testing');
    setCurrentQuestionIndex(0);
    setAnswers([]);
  };

  const handleAnswerSubmit = (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setAnswered(true);
  };

  const handleNextQuestion = () => {
    setAnswered(false);
    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      if (gam) gam.syncToServer();
      setTestState('results');
    }
  };

  const handleRetry = () => {
    setTestState('testing');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setAnswered(false);
  };

  const handleNewTest = () => {
    setTestState('config');
    setTestData(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setAnswered(false);
  };

  const handleSaveToBank = async () => {
    // Refresh previous tests after saving
    try {
      const response = await apiFetch('/api/generated');
      if (response.ok) {
        const tests = await response.json();
        setPreviousTests(tests.generations || []);
      }
    } catch (error) {
      console.error('Failed to refresh tests:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
        <div className="text-xl" style={{ color: 'var(--text-primary)' }}>Loading...</div>
      </div>
    );
  }

  if (!apiConfigured) {
    return (
      <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Dynamic Test Generation</h1>
              <p style={{ color: 'var(--text-secondary)' }}>AI-powered custom questions tailored to your needs</p>
            </div>

            <div className="bg-amber-900/50 border border-amber-600 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <span className="text-3xl">🔑</span>
                <div>
                  <h3 className="font-semibold text-amber-200 mb-2">API Key Required</h3>
                  <p className="text-amber-100 mb-4">
                    To use Dynamic Test mode, you need to configure your Anthropic API key.
                  </p>
                  <ol className="space-y-2 text-sm text-amber-100">
                    <li>1. Open the <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-card-solid)' }}>.env</code> file in the project root</li>
                    <li>2. Replace <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-card-solid)' }}>sk-ant-your-key-here</code> with your actual API key</li>
                    <li>3. Restart the server</li>
                    <li>4. Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">console.anthropic.com</a></li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to))' }}>
      <div className="container mx-auto px-4">
        {testState === 'config' && (
          <>
            <div className="mb-8 max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Dynamic Test Generation</h1>
              <p style={{ color: 'var(--text-secondary)' }}>AI-powered custom questions tailored to your needs</p>
            </div>
            <TestConfig
              profile={profile}
              onStartTest={handleStartTest}
              previousTests={previousTests}
              literalLanguage={literalLanguage}
            />
          </>
        )}

        {testState === 'testing' && testData && (
          <>
            <div className="max-w-3xl mx-auto mb-4 flex justify-between items-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Question {currentQuestionIndex + 1} of {testData.questions.length}
              </p>
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 rounded-lg transition-colors"
              >
                Quit Test
              </button>
            </div>

            {showQuitConfirm && (
              <div className="max-w-3xl mx-auto mb-4 bg-red-900/40 border border-red-600 rounded-lg p-4 flex items-center justify-between">
                <p className="text-red-200 text-sm">Are you sure you want to quit? Your progress will be lost.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowQuitConfirm(false)}
                    className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  >
                    Continue Test
                  </button>
                  <button
                    onClick={handleNewTest}
                    className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                  >
                    Quit
                  </button>
                </div>
              </div>
            )}

            {currentQuestionIndex < testData.questions.length && (
              <TestQuestion
                key={currentQuestionIndex}
                question={testData.questions[currentQuestionIndex]}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={testData.questions.length}
                profile={profile}
                literalLanguage={literalLanguage}
                onAnswerSubmit={handleAnswerSubmit}
              />
            )}
            {answered && (
              <div className="max-w-3xl mx-auto mt-4 text-center">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                >
                  {currentQuestionIndex < testData.questions.length - 1
                    ? 'Next Question →'
                    : 'See Results →'}
                </button>
              </div>
            )}
          </>
        )}

        {testState === 'results' && testData && (
          <TestResults
            testData={testData}
            answers={answers}
            profile={profile}
            literalLanguage={literalLanguage}
            onRetry={handleRetry}
            onNewTest={handleNewTest}
            onSaveToBank={handleSaveToBank}
          />
        )}
      </div>
    </div>
  );
}