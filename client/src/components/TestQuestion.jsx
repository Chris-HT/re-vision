import { useState } from 'react';
import { apiFetch } from '../utils/api';

export default function TestQuestion({ 
  question, 
  questionNumber, 
  totalQuestions, 
  profile,
  onAnswerSubmit 
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [freeTextAnswer, setFreeTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markingResult, setMarkingResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmitMultipleChoice = () => {
    if (!selectedOption) return;
    
    const isCorrect = selectedOption === question.correctOption;
    setSubmitted(true);
    
    onAnswerSubmit({
      questionId: question.id,
      format: 'multiple_choice',
      studentAnswer: selectedOption,
      isCorrect,
      score: isCorrect ? 100 : 0
    });
  };

  const handleSubmitFreeText = async () => {
    if (!freeTextAnswer.trim()) return;
    
    setMarking(true);
    setError(null);
    
    try {
      const response = await apiFetch('/api/mark', {
        method: 'POST',
        body: JSON.stringify({
          question: question.question,
          correctAnswer: question.answer,
          studentAnswer: freeTextAnswer,
          ageGroup: profile.ageGroup
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.userMessage || data.error || 'Failed to mark answer');
      }

      setMarkingResult(data);
      setSubmitted(true);
      
      onAnswerSubmit({
        questionId: question.id,
        format: 'free_text',
        studentAnswer: freeTextAnswer,
        isCorrect: data.isCorrect,
        score: data.score,
        feedback: data.feedback,
        keyPointsMissed: data.keyPointsMissed,
        encouragement: data.encouragement
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Difficulty: {Array(question.difficulty || 2).fill('⭐').join('')}
            </span>
          </div>
        </div>
        <div className="w-full rounded-full h-3 overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg p-8" style={{ backgroundColor: 'var(--bg-card-solid)' }}>
        <h3 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
          {question.question}
        </h3>

        {question.format === 'multiple_choice' ? (
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const optionLetter = option.substring(0, 1);
              const isSelected = selectedOption === optionLetter;
              const isCorrect = submitted && optionLetter === question.correctOption;
              const isWrong = submitted && isSelected && !isCorrect;
              
              return (
                <button
                  key={index}
                  onClick={() => !submitted && setSelectedOption(optionLetter)}
                  disabled={submitted}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    isCorrect
                      ? 'bg-green-600/20 border-2 border-green-500'
                      : isWrong
                      ? 'bg-red-600/20 border-2 border-red-500'
                      : isSelected
                      ? 'bg-blue-600/20 border-2 border-blue-500'
                      : 'border-2 border-transparent'
                  }`}
                  style={!isCorrect && !isWrong && !isSelected ? { backgroundColor: 'var(--bg-input)' } : undefined}
                >
                  <span style={{ color: 'var(--text-primary)' }}>{option}</span>
                  {submitted && isCorrect && (
                    <span className="ml-2 text-green-400">✓ Correct</span>
                  )}
                  {submitted && isWrong && (
                    <span className="ml-2 text-red-400">✗ Incorrect</span>
                  )}
                </button>
              );
            })}
            
            {!submitted && (
              <button
                onClick={handleSubmitMultipleChoice}
                disabled={!selectedOption}
                className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Submit Answer
              </button>
            )}
            
            {submitted && (
              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
                <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Explanation:</p>
                <p style={{ color: 'var(--text-secondary)' }}>{question.answer}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              value={freeTextAnswer}
              onChange={(e) => setFreeTextAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={submitted || marking}
              className="w-full h-32 px-4 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
            
            {!submitted && (
              <button
                onClick={handleSubmitFreeText}
                disabled={!freeTextAnswer.trim() || marking}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                {marking ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Claude is marking your answer...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </button>
            )}
            
            {error && (
              <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
              </div>
            )}
            
            {submitted && markingResult && (
              <div className="space-y-4">
                <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Your Score</h4>
                    <span className={`text-3xl font-bold ${getScoreColor(markingResult.score)}`}>
                      {markingResult.score}%
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Feedback</p>
                      <p style={{ color: 'var(--text-primary)' }}>{markingResult.feedback}</p>
                    </div>
                    
                    {markingResult.keyPointsMissed?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Points to improve</p>
                        <div className="flex flex-wrap gap-2">
                          {markingResult.keyPointsMissed.map((point, i) => (
                            <span key={i} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {markingResult.encouragement && (
                      <p className="text-blue-300 italic">{markingResult.encouragement}</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-400 mb-2">Correct Answer</p>
                  <p className="text-green-100">{question.answer}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}