import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { generateQuiz } from '@/lib/claude';
import { getVideoQuizResult, saveQuizResult } from '@/lib/firebase';
import { Brain, CheckCircle, XCircle, Trophy, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Video, QuizQuestion, QuizResult } from '@/types';

interface QuizPanelProps {
  video: Video;
}

export function QuizPanel({ video }: QuizPanelProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [previousResult, setPreviousResult] = useState<QuizResult | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, { selected: number; correct: boolean }>>(new Map());

  // Check for previous quiz result
  useEffect(() => {
    const checkPreviousResult = async () => {
      if (!user) return;
      
       setQuestions([]);
       setHasStarted(false);
       setCurrentQuestionIndex(0);
       setScore(0);
       setSelectedAnswer(null);
       setShowResult(false);
       setAnsweredQuestions(new Map());
       setPreviousResult(null);
      
      try {
        const result = await getVideoQuizResult(video.id, user.uid);
        if (result) {
          setPreviousResult(result);
        }
      } catch (error) {
        console.error('Error checking quiz result:', error);
      }
    };

    checkPreviousResult();
  }, [video.id, user]);

  // Generate quiz
  const handleGenerateQuiz = async () => {
    if (!user) {
      toast.error('Please sign in to generate quizzes');
      return;
    }

    setIsGenerating(true);
    try {
      const generatedQuestions = await generateQuiz(video.title, '');
      setQuestions(generatedQuestions);
      setHasStarted(true);
      setCurrentQuestionIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setAnsweredQuestions(new Map());
      toast.success('Quiz generated!');
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle answer selection
  const handleSelectAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return; // Already answered

    setSelectedAnswer(answerIndex);
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    if (isCorrect) {
      setScore(score + 1);
    }

    setAnsweredQuestions(new Map(answeredQuestions.set(currentQuestionIndex, { 
      selected: answerIndex, 
      correct: isCorrect 
    })));

    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      } else {
        setShowResult(true);
        saveResult(score + (isCorrect ? 1 : 0));
      }
    }, 1500);
  };

  // Save quiz result
  const saveResult = async (finalScore: number) => {
    if (!user) return;

    try {
      await saveQuizResult({
        videoId: video.id,
        uid: user.uid,
        score: finalScore,
        totalQuestions: questions.length,
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  };

  // Restart quiz
  const handleRestart = () => {
    setHasStarted(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnsweredQuestions(new Map());
  };

  // Get option style
  const getOptionStyle = (index: number) => {
    if (selectedAnswer === null) {
      return 'bg-[#0B0B0D] border-[rgba(255,255,255,0.08)] hover:border-[#FF2D8D]/50 hover:bg-[#1a1a1c]';
    }

    const currentQuestion = questions[currentQuestionIndex];
    
    if (index === currentQuestion.correctAnswer) {
      return 'bg-[#22c55e]/20 border-[#22c55e]';
    }
    
    if (index === selectedAnswer && index !== currentQuestion.correctAnswer) {
      return 'bg-[#ef4444]/20 border-[#ef4444]';
    }
    
    return 'bg-[#0B0B0D] border-[rgba(255,255,255,0.08)] opacity-50';
  };

  // Render start screen
  if (!hasStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FF2D8D]/10 flex items-center justify-center mb-4">
          <Brain className="w-8 h-8 text-[#FF2D8D]" />
        </div>
        
        <h3 className="text-lg font-semibold text-[#F4F4F5] mb-2">
          Test Your Knowledge
        </h3>
        
        <p className="text-sm text-[#A7A7AD] mb-6 max-w-xs">
          Generate a 5-question quiz based on "{video.title}" to test your understanding
        </p>

        {previousResult && (
          <div className="mb-6 p-4 bg-[#1a1a1c] rounded-xl">
            <p className="text-xs text-[#A7A7AD] mb-1">Previous attempt</p>
            <p className="text-lg font-semibold text-[#F4F4F5]">
              {previousResult.score}/{previousResult.totalQuestions} correct
            </p>
            <p className="text-xs text-[#A7A7AD]">
              {new Date(previousResult.completedAt).toLocaleDateString()}
            </p>
          </div>
        )}
        
        <Button
          onClick={handleGenerateQuiz}
          disabled={isGenerating}
          className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white rounded-full px-6"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Quiz
            </>
          )}
        </Button>
      </div>
    );
  }

  // Render results
  if (showResult) {
    const isPerfect = score === questions.length;
    const isGood = score >= questions.length * 0.6;

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${
          isPerfect ? 'bg-[#22c55e]/20' : isGood ? 'bg-[#fbbf24]/20' : 'bg-[#ef4444]/20'
        }`}>
          <Trophy className={`w-10 h-10 ${
            isPerfect ? 'text-[#22c55e]' : isGood ? 'text-[#fbbf24]' : 'text-[#ef4444]'
          }`} />
        </div>
        
        <h3 className="text-2xl font-semibold text-[#F4F4F5] mb-2">
          {isPerfect ? 'Perfect Score!' : isGood ? 'Great Job!' : 'Keep Learning!'}
        </h3>
        
        <p className="text-sm text-[#A7A7AD] mb-6">
          You got {score} out of {questions.length} questions correct
        </p>

        <div className="flex items-center gap-2 mb-8">
          {questions.map((_, index) => {
            const answer = answeredQuestions.get(index);
            return (
              <div
                key={index}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  answer?.correct 
                    ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                    : 'bg-[#ef4444]/20 text-[#ef4444]'
                }`}
              >
                {answer?.correct ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={handleRestart}
            variant="outline"
            className="border-[rgba(255,255,255,0.15)] text-[#A7A7AD]"
          >
            Back
          </Button>
          <Button
            onClick={handleGenerateQuiz}
            className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render quiz question
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#A7A7AD]">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-[#A7A7AD]">
            Score: {score}
          </span>
        </div>
        <div className="h-1 bg-[#1a1a1c] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#FF2D8D] rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-base font-medium text-[#F4F4F5] mb-6">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={selectedAnswer !== null}
              className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${getOptionStyle(index)}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  selectedAnswer === null 
                    ? 'bg-[#1a1a1c] text-[#A7A7AD]' 
                    : index === currentQuestion.correctAnswer
                    ? 'bg-[#22c55e] text-white'
                    : selectedAnswer === index
                    ? 'bg-[#ef4444] text-white'
                    : 'bg-[#1a1a1c] text-[#A7A7AD]'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-sm text-[#F4F4F5]">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
