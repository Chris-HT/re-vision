import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TestConfig from '../components/TestConfig';
import TestQuestion from '../components/TestQuestion';
import TestResults from '../components/TestResults';

export default function DynamicTest({ profile }) {
  const navigate = useNavigate();
  const [testState, setTestState] = useState('config'); // config, testing, results
  const [testData, setTestData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [previousTests, setPreviousTests] = useState([]);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

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
          fetch('/api/generated')
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

    // Move to next question after a delay
    setTimeout(() => {
      if (currentQuestionIndex < testData.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // All questions answered, show results
        setTestState('results');
      }
    }, 1500);
  };

  const handleRetry = () => {
    setTestState('testing');
    setCurrentQuestionIndex(0);
    setAnswers([]);
  };

  const handleNewTest = () => {
    setTestState('config');
    setTestData(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
  };

  const handleSaveToBank = async () => {
    // Refresh previous tests after saving
    try {
      const response = await fetch('/api/generated');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!apiConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Dynamic Test Generation</h1>
              <p className="text-slate-300">AI-powered custom questions tailored to your needs</p>
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
                    <li>1. Open the <code className="bg-slate-800 px-2 py-1 rounded">.env</code> file in the project root</li>
                    <li>2. Replace <code className="bg-slate-800 px-2 py-1 rounded">sk-ant-your-key-here</code> with your actual API key</li>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        {testState === 'config' && (
          <>
            <div className="mb-8 max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-white mb-2">Dynamic Test Generation</h1>
              <p className="text-slate-300">AI-powered custom questions tailored to your needs</p>
            </div>
            <TestConfig
              profile={profile}
              onStartTest={handleStartTest}
              previousTests={previousTests}
            />
          </>
        )}

        {testState === 'testing' && testData && (
          <>
            {currentQuestionIndex < testData.questions.length && (
              <TestQuestion
                question={testData.questions[currentQuestionIndex]}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={testData.questions.length}
                profile={profile}
                onAnswerSubmit={handleAnswerSubmit}
              />
            )}
            {answers.length > 0 && currentQuestionIndex < testData.questions.length - 1 && (
              <div className="max-w-3xl mx-auto mt-4 text-center">
                <button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                >
                  Next Question →
                </button>
              </div>
            )}
          </>
        )}

        {testState === 'results' && testData && (
          <TestResults
            testData={testData}
            answers={answers}
            onRetry={handleRetry}
            onNewTest={handleNewTest}
            onSaveToBank={handleSaveToBank}
          />
        )}
      </div>
    </div>
  );
}