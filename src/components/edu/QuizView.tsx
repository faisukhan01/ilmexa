'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, CheckCircle2, XCircle, Loader2, Trophy, RotateCcw,
  ChevronRight, History, Clock, HelpCircle, FileText as FileTextIcon,
  X, Upload, Eye, MessageSquare, CheckSquare, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import type { QuizData, QuizMode } from '@/lib/store';

interface PastQuiz {
  id: string;
  title: string;
  score: number | null;
  totalQuestions: number;
  createdAt: string;
}

function getTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getScoreColor(score: number | null, total: number): string {
  if (score === null) return 'bg-muted text-muted-foreground';
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (pct >= 70) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (pct >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400';
}

const topicSuggestions = ['Data Structures', 'Organic Chemistry', 'Thermodynamics', 'Microeconomics', 'European History', 'Linear Algebra'];

export function QuizView() {
  const { quiz, setQuiz } = useAppStore();
  const {
    topic, numQuestions, difficulty, quizMode,
    currentQuiz, currentQIndex, selectedAnswer, typedAnswer,
    showAnswer, showResult, isSubmitted,
  } = quiz;

  const [isGenerating, setIsGenerating] = useState(false);
  const [quizHistory, setQuizHistory] = useState<PastQuiz[]>([]);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/quiz')
      .then(r => r.json())
      .then(data => { if (data.quizzes) setQuizHistory(data.quizzes as PastQuiz[]); })
      .catch(() => {});
  }, []);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), numQuestions: parseInt(numQuestions), difficulty, quizMode }),
      });
      const data = await res.json();
      if (data.error) {
        setGenerateError(data.error);
      } else if (data.questions) {
        const newQuiz: QuizData = {
          id: data.quizId,
          title: data.title,
          questions: data.questions,
          totalQuestions: data.questions.length,
        };
        setQuiz({
          currentQuiz: newQuiz, currentQIndex: 0,
          selectedAnswer: null, typedAnswer: '', showAnswer: false,
          showResult: false, isSubmitted: false,
        });
      } else {
        setGenerateError('Failed to generate quiz. Please try again.');
      }
    } catch {
      setGenerateError('Network error. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        setQuiz({ topic: data.text.slice(0, 2000) });
        setUploadedFile(file.name);
      } else {
        setGenerateError(data.error || 'Failed to extract text from file.');
      }
    } catch {
      setGenerateError('Failed to read file. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // MCQ: submit answer
  const submitAnswer = () => {
    if (!selectedAnswer || !currentQuiz) return;
    const updated: QuizData = {
      ...currentQuiz,
      questions: currentQuiz.questions.map((q, i) =>
        i === currentQIndex
          ? { ...q, userAnswer: selectedAnswer, isCorrect: selectedAnswer === q.correctAnswer }
          : q
      ),
    };
    setQuiz({ currentQuiz: updated, isSubmitted: true });
  };

  // Q&A: submit answer to AI for grading
  const submitQAAnswer = async () => {
    if (!currentQuiz || isGrading) return;
    const q = currentQuiz.questions[currentQIndex];
    setIsGrading(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          userAnswer: typedAnswer.trim(),
          correctAnswer: q.correctAnswer,
        }),
      });
      const data = await res.json();
      const updated: QuizData = {
        ...currentQuiz,
        questions: currentQuiz.questions.map((question, i) =>
          i === currentQIndex
            ? { ...question, userAnswer: typedAnswer, isCorrect: data.isCorrect, qaFeedback: data.feedback }
            : question
        ),
      };
      setQuiz({ currentQuiz: updated, isSubmitted: true, showAnswer: true });
    } catch {
      // Fallback: just show the model answer
      const updated: QuizData = {
        ...currentQuiz,
        questions: currentQuiz.questions.map((question, i) =>
          i === currentQIndex ? { ...question, userAnswer: typedAnswer } : question
        ),
      };
      setQuiz({ currentQuiz: updated, showAnswer: true, isSubmitted: true });
    } finally {
      setIsGrading(false);
    }
  };

  const nextQuestion = () => {
    if (!currentQuiz) return;
    setShowDiscardConfirm(false);
    if (currentQIndex < currentQuiz.questions.length - 1) {
      setQuiz({
        currentQIndex: currentQIndex + 1,
        selectedAnswer: null, typedAnswer: '', showAnswer: false, isSubmitted: false,
      });
    } else {
      if (quizMode === 'mcq') {
        // MCQ: submit all answers to API
        const answers = currentQuiz.questions
          .filter(q => q.userAnswer)
          .map(q => ({ questionId: q.id, answer: q.userAnswer! }));
        fetch('/api/quiz', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: currentQuiz.id, answers }),
        }).then(r => r.json()).then(data => {
          if (data.score !== undefined) {
            const updated: QuizData = { ...currentQuiz, score: data.score };
            setQuiz({ currentQuiz: updated });
            setQuizHistory(prev => [{
              id: updated.id, title: updated.title,
              score: data.score, totalQuestions: updated.totalQuestions,
              createdAt: new Date().toISOString(),
            }, ...prev.filter(q => q.id !== updated.id)]);
          }
        }).catch(() => {});
      } else if (quizMode === 'qa') {
        // Q&A: score already computed per-question by AI grading
        const qaScore = currentQuiz.questions.filter(q => q.isCorrect === true).length;
        fetch('/api/quiz', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: currentQuiz.id, score: qaScore, isQA: true }),
        }).then(r => r.json()).then(data => {
          if (data.score !== undefined) {
            const updated: QuizData = { ...currentQuiz, score: data.score };
            setQuiz({ currentQuiz: updated });
            setQuizHistory(prev => [{
              id: updated.id, title: updated.title,
              score: data.score, totalQuestions: updated.totalQuestions,
              createdAt: new Date().toISOString(),
            }, ...prev.filter(q => q.id !== updated.id)]);
          }
        }).catch(() => {});
      }
      setQuiz({ showResult: true });
    }
  };

  const discardQuiz = () => {
    if (showDiscardConfirm) {
      setQuiz({
        currentQuiz: null, showResult: false,
        currentQIndex: 0, selectedAnswer: null, typedAnswer: '', showAnswer: false, isSubmitted: false,
      });
      setShowDiscardConfirm(false);
    } else {
      setShowDiscardConfirm(true);
      setTimeout(() => setShowDiscardConfirm(false), 3000);
    }
  };

  const retakeQuiz = () => {
    if (!currentQuiz) return;
    setQuiz({
      currentQuiz: {
        ...currentQuiz,
        questions: currentQuiz.questions.map(q => ({ ...q, userAnswer: undefined, isCorrect: undefined })),
        score: undefined,
      },
      currentQIndex: 0, selectedAnswer: null, typedAnswer: '', showAnswer: false,
      showResult: false, isSubmitted: false,
    });
  };

  const score = currentQuiz?.questions.filter(q => q.isCorrect).length || 0;
  const total = currentQuiz?.questions.length || 0;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // ── Results screen ──────────────────────────────────────────────────────────
  if (currentQuiz && showResult) {
    const isQA = quizMode === 'qa';
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/50 backdrop-blur-sm shrink-0">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
            <Trophy className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Quiz Complete</h2>
            <p className="text-xs text-muted-foreground">{currentQuiz.title}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                {isQA ? (
                  <>
                    <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold ${percentage >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : percentage >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'}`}>
                      {percentage}%
                    </div>
                    <h3 className="text-xl font-bold mb-1">{score} / {total} Correct</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {percentage >= 80 ? 'Excellent work! 🎉' : percentage >= 60 ? 'Good effort! Keep studying 💪' : 'Keep practicing! Review the answers below 📚'}
                    </p>
                    <Progress value={percentage} className="h-2 mb-4" />
                  </>
                ) : (
                  <>
                    <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold ${percentage >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : percentage >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                      {percentage}%
                    </div>
                    <h3 className="text-xl font-bold mb-1">{score} / {total} Correct</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {percentage >= 80 ? 'Excellent work! 🎉' : percentage >= 60 ? 'Good effort! Keep studying 💪' : 'Keep practicing! You can do better 📚'}
                    </p>
                    <Progress value={percentage} className="h-2 mb-4" />
                  </>
                )}
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={retakeQuiz} className="gap-2">
                    <RotateCcw className="w-4 h-4" /> Retake
                  </Button>
                  <Button onClick={() => setQuiz({ currentQuiz: null, showResult: false })} className="bg-rose-600 hover:bg-rose-700">
                    New Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>

            {currentQuiz.questions.map((q, i) => (
              <Card key={q.id} className={`border-0 shadow-sm ${q.isCorrect ? 'border-l-4 border-l-emerald-500' : q.isCorrect === false ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-violet-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {q.isCorrect === true && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                    {q.isCorrect === false && <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
                    {q.isCorrect === undefined && <MessageSquare className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />}
                    <p className="text-sm font-medium">Q{i + 1}. {q.question}</p>
                  </div>
                  <div className="ml-6 space-y-1">
                    {isQA ? (
                      <>
                        {q.userAnswer && <p className="text-xs text-muted-foreground">Your answer: <span className="text-foreground">{q.userAnswer}</span></p>}
                        {q.qaFeedback && <p className="text-xs text-muted-foreground italic">{q.qaFeedback}</p>}
                        <p className="text-xs text-muted-foreground">Model answer: <span className="text-emerald-600 dark:text-emerald-400">{q.correctAnswer}</span></p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">Your answer: <span className={q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}>{q.userAnswer}</span></p>
                        {!q.isCorrect && <p className="text-xs text-muted-foreground">Correct: <span className="text-emerald-600">{q.correctAnswer}</span></p>}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active quiz session ─────────────────────────────────────────────────────
  if (currentQuiz && !showResult) {
    const q = currentQuiz.questions[currentQIndex];
    const isQA = quizMode === 'qa';
    const canProceedQA = isSubmitted; // Q&A: must submit + get AI grade before next
    const canProceedMCQ = isSubmitted;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-3 pb-3 border-b bg-card/50 backdrop-blur-sm shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
              <Brain className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm truncate">{currentQuiz.title}</h2>
              <p className="text-xs text-muted-foreground">
                Question {currentQIndex + 1} of {total} ·{' '}
                <span className={isQA ? 'text-violet-600 dark:text-violet-400' : 'text-rose-600 dark:text-rose-400'}>
                  {isQA ? 'Q&A Mode' : 'MCQ Mode'}
                </span>
              </p>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
              {Math.round((currentQIndex / total) * 100)}%
            </span>
          </div>
          <Progress value={(currentQIndex / total) * 100} className="h-2 rounded-full" />
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <button
              onClick={discardQuiz}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                showDiscardConfirm
                  ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/30 scale-105'
                  : 'bg-background text-muted-foreground border-border hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              {showDiscardConfirm ? '⚠ Confirm discard?' : 'Discard'}
            </button>

            <div className="flex items-center gap-2">
              {isQA ? (
                !isSubmitted ? (
                  <Button
                    onClick={submitQAAnswer}
                    disabled={isGrading}
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 shadow-sm"
                  >
                    {isGrading
                      ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Grading...</>
                      : <><Send className="w-4 h-4 mr-1.5" />Submit Answer</>
                    }
                  </Button>
                ) : (
                  <Button
                    onClick={nextQuestion}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-md shadow-emerald-500/30 px-5"
                  >
                    {currentQIndex < total - 1 ? 'Next Question →' : '🎉 Finish'}
                  </Button>
                )
              ) : (
                !isSubmitted ? (
                  <Button
                    onClick={submitAnswer}
                    disabled={!selectedAnswer}
                    className="bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm px-5"
                  >
                    Submit <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={nextQuestion}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-md shadow-emerald-500/30 px-5"
                  >
                    {currentQIndex < total - 1 ? 'Next Question →' : '🎉 See Results'}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-base font-semibold mb-4">{q.question}</h3>

                {isQA ? (
                  <div className="space-y-3">
                    <Textarea
                      value={typedAnswer}
                      onChange={(e) => setQuiz({ typedAnswer: e.target.value })}
                      placeholder="Type your answer here..."
                      disabled={isSubmitted || isGrading}
                      className="rounded-xl text-sm resize-none h-28 overflow-y-auto"
                    />
                    <AnimatePresence>
                      {isSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          {/* AI verdict */}
                          <div className={`rounded-xl p-3 flex items-start gap-2.5 ${q.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'}`}>
                            {q.isCorrect
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              : <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                            }
                            <div>
                              <p className={`text-sm font-semibold ${q.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                {q.isCorrect ? '✅ Correct!' : '❌ Not quite right'}
                              </p>
                              {q.qaFeedback && (
                                <p className="text-xs mt-0.5 text-muted-foreground">{q.qaFeedback}</p>
                              )}
                            </div>
                          </div>
                          {/* Model answer */}
                          <div className="rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Model Answer</span>
                            </div>
                            <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">{q.correctAnswer}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => !isSubmitted && setQuiz({ selectedAnswer: opt })}
                        className={`w-full text-left p-3 rounded-xl border text-sm transition-all duration-200 flex items-center gap-3 ${
                          isSubmitted && opt === q.correctAnswer
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : isSubmitted && opt === selectedAnswer && opt !== q.correctAnswer
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                            : !isSubmitted && opt === selectedAnswer
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'hover:bg-accent border-border'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSubmitted && opt === q.correctAnswer ? 'border-emerald-500 bg-emerald-500 text-white' :
                          isSubmitted && opt === selectedAnswer && opt !== q.correctAnswer ? 'border-rose-500 bg-rose-500 text-white' :
                          opt === selectedAnswer ? 'border-primary bg-primary text-primary-foreground' :
                          'border-muted-foreground/30'
                        }`}>
                          {(isSubmitted && opt === q.correctAnswer) ? '✓'
                            : opt === selectedAnswer && !isSubmitted ? '✓'
                            : opt === selectedAnswer && isSubmitted && opt !== q.correctAnswer ? '✗'
                            : ''}
                        </div>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isSubmitted && !isQA && (
              <Card className={`border-0 shadow-sm p-4 ${q.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                <p className={`text-sm font-semibold ${q.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {q.isCorrect ? '✅ Correct! Great job!' : `❌ Incorrect. The correct answer is: ${q.correctAnswer}`}
                </p>
                {currentQIndex < total - 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Click <strong>Next →</strong> at the top to continue
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Setup screen ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/50 backdrop-blur-sm shrink-0">
        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
          <Brain className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Quiz Generator</h2>
          <p className="text-xs text-muted-foreground">Test your knowledge with AI-generated quizzes</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Quiz Mode Toggle */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { mode: 'mcq' as QuizMode, icon: CheckSquare, label: 'MCQ Quiz', desc: 'Multiple choice answers', color: 'rose' },
              { mode: 'qa' as QuizMode, icon: MessageSquare, label: 'Q&A Quiz', desc: 'Open-ended questions', color: 'violet' },
            ] as const).map(({ mode, icon: Icon, label, desc, color }) => (
              <button
                key={mode}
                onClick={() => setQuiz({ quizMode: mode })}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  quizMode === mode
                    ? color === 'rose'
                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30'
                      : 'border-violet-400 bg-violet-50 dark:bg-violet-950/30'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  quizMode === mode
                    ? color === 'rose' ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-violet-100 dark:bg-violet-900/40'
                    : 'bg-muted'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    quizMode === mode
                      ? color === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-violet-600 dark:text-violet-400'
                      : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    quizMode === mode
                      ? color === 'rose' ? 'text-rose-700 dark:text-rose-300' : 'text-violet-700 dark:text-violet-300'
                      : 'text-foreground'
                  }`}>{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Topic Input Card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-4">
              {/* Upload zone — visible & prominent */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.pptx,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all duration-200 group disabled:opacity-60 ${
                    uploadedFile
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                      : 'border-border hover:border-rose-400/60 hover:bg-rose-50/50 dark:hover:bg-rose-950/10'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    uploadedFile ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30'
                  }`}>
                    {isUploading
                      ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      : uploadedFile
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      : <Upload className="w-4 h-4 text-muted-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                    }
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${uploadedFile ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                      {isUploading ? 'Reading file…' : uploadedFile ? uploadedFile : 'Upload a file to generate quiz'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {uploadedFile ? 'File content loaded — click to replace' : 'PDF, Word (.docx), PowerPoint (.pptx), or text files'}
                    </p>
                  </div>
                </button>
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">OR type / paste</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Topic textarea - fixed height */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Topic or Paste Content</label>
                  <span className="text-[11px] text-muted-foreground">{topic.length}/2000</span>
                </div>
                <div className="relative rounded-xl border border-input focus-within:ring-2 focus-within:ring-ring overflow-hidden" style={{ height: '120px' }}>
                  <textarea
                    value={topic}
                    onChange={(e) => setQuiz({ topic: e.target.value.slice(0, 2000) })}
                    placeholder={
                      quizMode === 'qa'
                        ? 'Enter a topic or paste lecture notes to generate open-ended questions...'
                        : 'Enter a topic (e.g. Organic Chemistry) or paste notes to get quizzed on...'
                    }
                    maxLength={2000}
                    className="w-full h-full resize-none bg-background text-sm px-3 py-2.5 outline-none overflow-y-auto"
                  />
                </div>
              </div>

              {/* Suggestions */}
              <div className="flex gap-1.5 flex-wrap">
                {topicSuggestions.map(t => (
                  <button
                    key={t}
                    onClick={() => { setQuiz({ topic: t }); setUploadedFile(null); }}
                    className="text-[11px] px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-primary/10 hover:border-primary/30 transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Settings row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Questions</label>
                  <Select value={numQuestions} onValueChange={(v) => setQuiz({ numQuestions: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Questions</SelectItem>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                      <SelectItem value="15">15 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
                  <Select value={difficulty} onValueChange={(v) => setQuiz({ difficulty: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={generateQuiz}
                disabled={isGenerating || !topic.trim()}
                className={`w-full rounded-xl ${
                  quizMode === 'qa'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate {quizMode === 'qa' ? 'Q&A' : 'MCQ'} Quiz</>
                }
              </Button>

              {generateError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 dark:text-rose-300">{generateError}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiz History */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <History className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="font-semibold text-sm">Past Quizzes</h3>
            </div>
            {quizHistory.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No quizzes completed yet.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Generate your first quiz!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {quizHistory.map(q => (
                  <Card key={q.id} className="border-0 shadow-sm hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{q.totalQuestions} questions</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {q.createdAt ? getTimeAgo(q.createdAt) : '—'}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${getScoreColor(q.score, q.totalQuestions)}`}>
                        {q.score !== null ? `${q.score}/${q.totalQuestions}` : '—'}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
