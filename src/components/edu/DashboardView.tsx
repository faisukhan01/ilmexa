'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, MessageSquare, FileText,
  Timer, Sparkles, TrendingUp,
  Calendar, Target, Zap, GraduationCap,
  FileSearch, Calculator,
  ArrowUpRight, ChevronRight, AlertCircle, RefreshCw, Quote,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

interface DashboardStats { totalSessions: number; totalMinutes: number }
interface Activity { id: string; type: string; title: string; subtitle: string; timeAgo: string }
interface WeeklyData { day: string; minutes: number }
interface StoredExam { id: string; name: string; subject: string; date: string; color: string }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', emoji: '🌅', sub: 'Start strong — your best study session awaits.' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '☀️', sub: 'Keep the momentum going today!' };
  return { text: 'Good Evening', emoji: '🌙', sub: 'Evening sessions build the deepest habits.' };
}

const TIPS = [
  'Use the Feynman Technique — explain it simply to truly understand it.',
  'Study in 25-min focused sprints with short breaks for better retention.',
  'Testing yourself is more effective than re-reading. Quiz yourself daily!',
  'Write summaries in your own words to strengthen memory consolidation.',
  'Sleep is when your brain consolidates new learning. Prioritise rest!',
  'Connect new concepts to things you already know for deeper understanding.',
  'Teach what you learned — explaining reveals gaps in your knowledge.',
];

const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { text: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'The more that you read, the more things you will know.', author: 'Dr. Seuss' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
  { text: 'Great things never come from comfort zones.', author: 'Unknown' },
  { text: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { text: 'Strive for progress, not perfection.', author: 'Unknown' },
];

function getExamCountdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return { days, hours };
}

function loadExams(): StoredExam[] {
  try { return JSON.parse(localStorage.getItem('ilmexa-exams-v1') || '[]'); } catch { return []; }
}

const activityIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  quiz:      { icon: Brain,         color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/40' },
  study:     { icon: Timer,         color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/40' },
  note:      { icon: FileText,      color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950/40' },
  flashcard: { icon: BookOpen,      color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/40' },
  goal:      { icon: Target,        color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  chat:      { icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
};

const TOOLS = [
  { id: 'chat' as const,       icon: MessageSquare, label: 'AI Teacher',   desc: 'Ask anything instantly',       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', badge: 'Popular', grad: 'from-emerald-500 to-teal-400' },
  { id: 'quiz' as const,       icon: Brain,         label: 'Quiz Me',      desc: 'Test your knowledge with AI',  color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-950/30',    badge: 'New',     grad: 'from-rose-500 to-pink-400' },
  { id: 'solver' as const,     icon: Calculator,    label: 'AI Solver',    desc: 'Step-by-step solutions',       color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30', badge: null,      grad: 'from-violet-500 to-purple-400' },
  { id: 'summarizer' as const, icon: FileSearch,    label: 'Summarizer',   desc: 'Condense notes & articles',    color: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-50 dark:bg-cyan-950/30',    badge: null,      grad: 'from-cyan-500 to-sky-400' },
  { id: 'streak' as const,     icon: GraduationCap, label: 'Exam Tracker', desc: 'Countdown to every exam',      color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', badge: null,      grad: 'from-indigo-500 to-violet-400' },
  { id: 'pomodoro' as const,   icon: Timer,         label: 'Focus Timer',  desc: 'Pomodoro sessions tracked',    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', badge: null,      grad: 'from-orange-500 to-amber-400' },
];


export function DashboardView({ userName }: { userName?: string }) {
  const { setCurrentView } = useAppStore();
  const [stats, setStats]       = useState<DashboardStats>({ totalSessions: 0, totalMinutes: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [streak, setStreak]     = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [exams, setExams]       = useState<StoredExam[]>([]);
  const greeting = getGreeting();
  const tip = TIPS[new Date().getDay() % TIPS.length];
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [quoteSpinning, setQuoteSpinning] = useState(false);

  const refreshQuote = useCallback(() => {
    if (quoteSpinning) return;
    setQuoteSpinning(true);
    setTimeout(() => {
      setQuoteIndex(i => (i + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length);
      setQuoteSpinning(false);
    }, 350);
  }, [quoteSpinning]);

  const [todayIndex] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });

  const load = useCallback(async () => {
    setExams(loadExams());
    try {
      const [s, a, w, st] = await Promise.all([
        fetch('/api/study-sessions').then(r => r.json()).catch(() => ({})),
        fetch('/api/activity').then(r => r.json()).catch(() => ({ activities: [] })),
        fetch('/api/weekly').then(r => r.json()).catch(() => ({ weeklyData: [] })),
        fetch('/api/streak').then(r => r.json()).catch(() => ({ currentStreak: 0, totalActiveDays: 0 })),
      ]);
      setStats({ totalSessions: s.totalSessions || 0, totalMinutes: s.totalMinutes || 0 });
      setActivities(a.activities || []);
      setWeeklyData(w.weeklyData || []);
      setStreak(st.currentStreak || 0);
      setActiveDays(st.totalActiveDays || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dummy = DAYS.map((day, i) => ({ day, minutes: [45,30,60,20,50,15,35][i] }));
  const isNew = !loading && weeklyData.reduce((s, d) => s + d.minutes, 0) === 0;
  const chart = isNew ? dummy : (weeklyData.length > 0 ? weeklyData : dummy);
  const maxMin = Math.max(...chart.map(d => d.minutes), 1);
  const totalW = isNew ? 0 : chart.reduce((s, d) => s + d.minutes, 0);

  const upcomingExams = exams
    .map(e => ({ ...e, cd: getExamCountdown(e.date) }))
    .filter(e => e.cd !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const studyHours = Math.floor(stats.totalMinutes / 60);
  const studyMins  = stats.totalMinutes % 60;
  const weekHours  = Math.floor(totalW / 60);
  const weekMins   = totalW % 60;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto px-4 py-5 md:px-6 space-y-5">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl"
        >
          {/* Animated shifting gradient background */}
          <div className="absolute inset-0 hero-animated-bg" />

          {/* Dot-grid texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Floating glowing orbs */}
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-10 right-16 w-56 h-56 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4), transparent 70%)' }}
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 25, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute -bottom-8 left-10 w-48 h-48 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.35), transparent 70%)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.3), transparent 70%)' }}
          />

          {/* Rotating rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-8 -right-8 w-36 h-36 border-2 border-white/10 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-4 -right-4 w-20 h-20 border border-white/15 rounded-full"
          />

          {/* Content */}
          <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Animated emoji */}
              <motion.div
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-2xl sm:text-3xl shrink-0 drop-shadow-lg select-none"
              >
                {greeting.emoji}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight"
              >
                {greeting.text},{' '}
                <span className="hero-name-glow font-bold">{userName || 'Student'}</span>!
              </motion.h1>
            </div>
          </div>
        </motion.div>

        {/* ── Daily Quote ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="relative flex items-start gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm overflow-hidden group"
        >
          {/* Subtle left accent bar */}
          <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400 rounded-l-2xl" />

          {/* Quote icon */}
          <div className="shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center ring-1 ring-emerald-200/60 dark:ring-emerald-800/60">
              <Quote className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          {/* Quote text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium text-foreground leading-relaxed">
                "{QUOTES[quoteIndex].text}"
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-semibold tracking-wide">
                — {QUOTES[quoteIndex].author}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Refresh button */}
          <button
            type="button"
            onClick={refreshQuote}
            title="New quote"
            className="shrink-0 mt-0.5 p-1.5 rounded-lg text-muted-foreground/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 transition-transform duration-350 ${quoteSpinning ? 'animate-spin' : ''}`}
            />
          </button>
        </motion.div>

        {/* ── Exam Countdowns ──────────────────────────────────────────── */}
        <AnimatePresence>
          {upcomingExams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  Upcoming Exams
                  <Badge className="text-[9px] px-1.5 h-4 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0">
                    {upcomingExams.length}
                  </Badge>
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentView('streak')}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                >
                  Manage <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {upcomingExams.map((exam, i) => {
                  const cd = exam.cd!;
                  const isUrgent = cd.days <= 3;
                  const isHot = cd.days <= 1;
                  return (
                    <motion.button
                      key={exam.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.32 + i * 0.06 }}
                      onClick={() => setCurrentView('streak')}
                      className="shrink-0 w-44 sm:w-48 text-left rounded-2xl border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                      style={{
                        borderColor: exam.color + '40',
                        background: `linear-gradient(135deg, ${exam.color}08, ${exam.color}18)`,
                      }}
                    >
                      {/* color top strip */}
                      <div className="h-1" style={{ background: exam.color }} />
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: exam.color + '22', color: exam.color }}
                          >
                            {exam.subject}
                          </span>
                          {isHot && (
                            <motion.span
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="text-sm"
                            >🔥</motion.span>
                          )}
                          {isUrgent && !isHot && <AlertCircle className="w-3.5 h-3.5 text-orange-500" />}
                        </div>
                        <p className="text-xs font-bold leading-tight line-clamp-2 mb-2 group-hover:underline decoration-current/30">
                          {exam.name}
                        </p>
                        <div className="flex items-end gap-1">
                          <span
                            className="text-2xl font-black leading-none tabular-nums"
                            style={{ color: isHot ? '#ef4444' : isUrgent ? '#f97316' : exam.color }}
                          >
                            {cd.days}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium mb-0.5">
                            {cd.days === 1 ? 'day' : 'days'} left
                          </span>
                        </div>
                        {cd.days === 0 && (
                          <p className="text-[10px] font-semibold text-red-500 mt-0.5">{cd.hours}h remaining!</p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {/* Add exam CTA */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32 + upcomingExams.length * 0.06 }}
                  onClick={() => setCurrentView('streak')}
                  className="shrink-0 w-40 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-2 py-4 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 transition-all text-indigo-500 dark:text-indigo-400"
                >
                  <GraduationCap className="w-6 h-6 opacity-50" />
                  <span className="text-[11px] font-semibold">Add exam</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── No exams nudge (only when no upcoming exams) ─────────────── */}
        {!loading && upcomingExams.length === 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32 }}
            onClick={() => setCurrentView('streak')}
            className="w-full rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800 p-4 flex items-center gap-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-300 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Track your upcoming exams</p>
              <p className="text-[11px] text-muted-foreground">Add exams to see live countdowns right here on the dashboard</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </motion.button>
        )}

        {/* ── Chart + Activity ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Weekly chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="lg:col-span-2 rounded-2xl bg-card border border-border p-4 sm:p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                  Weekly Study Progress
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalW > 0 ? `${totalW} min studied this week` : 'Start studying to see your progress'}
                </p>
              </div>
              {totalW > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {weekHours}h {weekMins}m
                </span>
              )}
            </div>
            {isNew && (
              <p className="text-[11px] text-muted-foreground/50 italic mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse inline-block" />
                Preview — your data appears once you start studying
              </p>
            )}
            <div className="flex items-end gap-1 sm:gap-1.5" style={{ height: '120px' }}>
              {chart.map((d, i) => {
                const h = Math.max((d.minutes / maxMin) * 100, 5);
                const isToday = !isNew && i === todayIndex;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <span className="absolute -top-5 text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground whitespace-nowrap">
                      {isNew ? '' : `${d.minutes}m`}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}px` }}
                      transition={{ duration: 0.7, delay: 0.22 + i * 0.06, ease: 'easeOut' }}
                      className={`w-full rounded-t-md ${
                        isNew ? 'bg-muted/40'
                          : isToday ? 'bg-gradient-to-t from-emerald-700 to-teal-400'
                          : d.minutes > 0 ? 'bg-gradient-to-t from-emerald-600/70 to-teal-400/40 group-hover:from-emerald-600 group-hover:to-teal-400/60'
                          : 'bg-muted/30'
                      } transition-all duration-200`}
                    />
                    <span className={`text-[9px] sm:text-[10px] font-medium mt-1 ${
                      isNew ? 'text-muted-foreground/35'
                        : isToday ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-muted-foreground'
                    }`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1 rounded-2xl bg-card border border-border p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-500 shrink-0" />
                Recent Activity
              </h3>
              {activities.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-5">{activities.length}</Badge>
              )}
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: '180px' }}>
                {activities.slice(0, 8).map(a => {
                  const ic = activityIcons[a.type] || activityIcons.chat;
                  return (
                    <div key={a.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                      <div className={`w-7 h-7 rounded-lg ${ic.bg} flex items-center justify-center shrink-0`}>
                        <ic.icon className={`w-3.5 h-3.5 ${ic.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate leading-snug">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.subtitle}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{a.timeAgo}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground/30" />
                </div>
                <p className="text-xs text-muted-foreground/50 font-medium">No activity yet</p>
                <p className="text-[10px] text-muted-foreground/35 mt-0.5">Use the tools below to get started</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Quick Access Tools ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Quick Access
            </h2>
          </div>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {TOOLS.map(t => (
              <motion.button
                key={t.id}
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                onClick={() => setCurrentView(t.id)}
                className="group relative text-left rounded-2xl bg-card border border-border/60 p-4 hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden"
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.grad} opacity-0 group-hover:opacity-100 transition-all duration-300`} />
                <div className={`absolute inset-0 ${t.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                      <t.icon className={`w-5 h-5 ${t.color}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      {t.badge && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                          t.badge === 'Popular'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>{t.badge}</span>
                      )}
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold leading-snug mb-0.5 group-hover:text-primary transition-colors">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{t.desc}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
