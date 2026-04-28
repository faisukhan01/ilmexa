'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Plus, X, Trash2, Clock, Calendar,
  AlertTriangle, Zap, BookOpen, ChevronRight, Target,
  Timer, Flame, Trophy, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

interface Exam {
  id: string;
  name: string;
  subject: string;
  date: string;
  studyHours: number;
  notes: string;
  color: string;
}

const SUBJECT_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#14b8a6', label: 'Teal' },
];

function getCountdown(dateStr: string) {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diff = target - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, passed: true, urgent: false };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, passed: false, urgent: days <= 3 };
}

function getUrgencyStyle(days: number, passed: boolean) {
  if (passed) return { bg: 'from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/40', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  if (days <= 1) return { bg: 'from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40', border: 'border-red-200 dark:border-red-800', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
  if (days <= 3) return { bg: 'from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' };
  if (days <= 7) return { bg: 'from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40', border: 'border-yellow-200 dark:border-yellow-800', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' };
  return { bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
}

function UrgencyLabel({ days, passed }: { days: number; passed: boolean }) {
  if (passed) return <span className="flex items-center gap-1 text-slate-500 text-xs font-medium"><Clock className="w-3 h-3" />Completed</span>;
  if (days <= 1) return <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse"><Flame className="w-3 h-3" />Due today/tomorrow!</span>;
  if (days <= 3) return <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs font-semibold"><AlertTriangle className="w-3 h-3" />Urgent</span>;
  if (days <= 7) return <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-semibold"><Zap className="w-3 h-3" />This week</span>;
  return <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><Star className="w-3 h-3" />Upcoming</span>;
}

const STORAGE_KEY = 'ilmexa-exams-v1';

function loadExams(): Exam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveExams(exams: Exam[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exams)); } catch {}
}

export function ExamTrackerView() {
  const { setCurrentView } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [studyHours, setStudyHours] = useState('5');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0].value);
  const [, setTick] = useState(0);

  useEffect(() => {
    setExams(loadExams());
    const t = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const addExam = useCallback(() => {
    if (!name.trim() || !date) return;
    const newExam: Exam = {
      id: crypto.randomUUID(),
      name: name.trim(),
      subject: subject.trim() || 'General',
      date,
      studyHours: parseInt(studyHours) || 5,
      notes: notes.trim(),
      color,
    };
    const updated = [...exams, newExam].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExams(updated);
    saveExams(updated);
    setShowDialog(false);
    setName(''); setSubject(''); setDate(''); setStudyHours('5'); setNotes(''); setColor(SUBJECT_COLORS[0].value);
  }, [exams, name, subject, date, studyHours, notes, color]);

  const deleteExam = useCallback((id: string) => {
    const updated = exams.filter(e => e.id !== id);
    setExams(updated);
    saveExams(updated);
  }, [exams]);

  const upcoming = exams.filter(e => !getCountdown(e.date).passed);
  const passed = exams.filter(e => getCountdown(e.date).passed);
  const urgent = upcoming.filter(e => getCountdown(e.date).days <= 3);
  const thisWeek = upcoming.filter(e => getCountdown(e.date).days <= 7);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 space-y-5">

        {/* ── Hero Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl"
          style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 40%,#9333ea 70%,#c026d3 100%)' }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/[0.05]" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-purple-300/10" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute top-4 right-4 w-16 h-16 border border-white/10 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute top-6 right-6 w-8 h-8 border border-white/10 rounded-full"
            />
          </div>
          <div className="relative z-10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.07, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg shrink-0"
                >
                  <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
                    Exam Tracker
                  </h1>
                  <p className="text-purple-100/80 text-xs sm:text-sm mt-0.5">
                    Never miss an exam — countdown timers for every deadline
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowDialog(true)}
                className="shrink-0 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Exam</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Upcoming', value: upcoming.length, icon: Calendar, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30', iconBg: 'bg-violet-500' },
            { label: 'This Week', value: thisWeek.length, icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', iconBg: 'bg-amber-500' },
            { label: 'Urgent', value: urgent.length, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', iconBg: 'bg-red-500' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.07, type: 'spring', stiffness: 280, damping: 24 }}
              className={`rounded-2xl ${s.bg} border border-transparent p-3 sm:p-4 flex items-center gap-3`}
            >
              <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 shadow-md`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color} leading-none`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Exam Cards ── */}
        {exams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950/40 dark:to-purple-950/40 flex items-center justify-center mb-4 shadow-lg">
              <GraduationCap className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-lg font-bold mb-1">No exams tracked yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">
              Add your upcoming exams to get countdown timers and never be caught off guard
            </p>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Your First Exam
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" />
                  Upcoming Exams
                </h2>
                <div className="space-y-3">
                  <AnimatePresence>
                    {upcoming.map((exam, i) => {
                      const cd = getCountdown(exam.date);
                      const style = getUrgencyStyle(cd.days, cd.passed);
                      return (
                        <motion.div
                          key={exam.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12, height: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} p-4 sm:p-5`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Subject color dot */}
                            <div
                              className="w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-sm ring-2 ring-white dark:ring-card"
                              style={{ backgroundColor: exam.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <h3 className="font-bold text-base leading-tight">{exam.name}</h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge
                                      className="text-[10px] px-2 py-0 h-4 font-semibold border-0"
                                      style={{ backgroundColor: exam.color + '22', color: exam.color }}
                                    >
                                      {exam.subject}
                                    </Badge>
                                    <UrgencyLabel days={cd.days} passed={cd.passed} />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteExam(exam.id)}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Countdown */}
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <div className="text-center">
                                    <motion.p
                                      key={cd.days}
                                      initial={{ y: -4, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      className="text-3xl font-black leading-none tabular-nums"
                                      style={{ color: cd.days <= 1 ? '#ef4444' : cd.days <= 3 ? '#f97316' : cd.days <= 7 ? '#eab308' : '#10b981' }}
                                    >
                                      {cd.days}
                                    </motion.p>
                                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">days</p>
                                  </div>
                                  <p className="text-xl font-bold text-muted-foreground/40 pb-3">:</p>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold leading-none tabular-nums text-muted-foreground">{cd.hours}</p>
                                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">hrs</p>
                                  </div>
                                  <p className="text-xl font-bold text-muted-foreground/40 pb-3">:</p>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold leading-none tabular-nums text-muted-foreground">{cd.minutes}</p>
                                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">min</p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 ml-2">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                  {exam.studyHours > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <BookOpen className="w-3 h-3" />
                                      {exam.studyHours}h recommended study time
                                    </div>
                                  )}
                                </div>
                              </div>

                              {exam.notes && (
                                <p className="mt-2 text-xs text-muted-foreground bg-black/5 dark:bg-white/5 rounded-lg px-2.5 py-1.5 line-clamp-2">
                                  {exam.notes}
                                </p>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCurrentView('chat')}
                                className="mt-3 h-7 text-xs gap-1.5 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300 -ml-1"
                              >
                                <Zap className="w-3 h-3" />
                                Get AI study tips for this exam
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {passed.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5" />
                  Completed
                </h2>
                <div className="space-y-2 opacity-60">
                  {passed.map((exam) => {
                    const style = getUrgencyStyle(0, true);
                    return (
                      <div key={exam.id} className={`rounded-xl bg-gradient-to-br ${style.bg} border ${style.border} p-3 flex items-center gap-3`}>
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-through truncate">{exam.name}</p>
                          <p className="text-[10px] text-muted-foreground">{exam.subject} · {new Date(exam.date).toLocaleDateString()}</p>
                        </div>
                        <button type="button" onClick={() => deleteExam(exam.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Add exam FAB if exams exist ── */}
        {exams.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => setShowDialog(true)}
              variant="outline"
              className="gap-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
            >
              <Plus className="w-4 h-4" />
              Add Another Exam
            </Button>
          </div>
        )}
      </div>

      {/* ── Add Exam Dialog ── */}
      <AnimatePresence>
        {showDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-y-auto"
              style={{ maxHeight: '90vh' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  Add Exam
                </h3>
                <button type="button" onClick={() => setShowDialog(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Exam / Test Name *</label>
                  <Input
                    placeholder="e.g. Midterm Calculus, Physics Final"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-10"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Subject *</label>
                  <Input
                    placeholder="e.g. Mathematics, Physics, Computer Science"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Exam Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="h-10"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Recommended Study Hours</label>
                  <Input
                    type="number"
                    placeholder="5"
                    min="1"
                    max="100"
                    value={studyHours}
                    onChange={e => setStudyHours(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Subject Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {SUBJECT_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`w-7 h-7 rounded-full transition-all shadow-sm ${color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Textarea
                    placeholder="Topics to cover, exam format, materials allowed..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="min-h-[70px] resize-none text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
                  <Button
                    onClick={addExam}
                    disabled={!name.trim() || !date}
                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
                  >
                    <Timer className="w-4 h-4 mr-1.5" />
                    Start Countdown
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
