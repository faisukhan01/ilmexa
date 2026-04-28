'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Flame, Trophy, Calendar, Sparkles, Loader2, TrendingUp,
  Activity, Clock, Brain, Plus, X, Smile, Zap, Target, Award,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';

interface HeatmapDay {
  date: string;
  minutes: number;
  sessions: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  todayActive: boolean;
  heatmap: HeatmapDay[];
  thisWeekSessions: number;
}

interface MoodEntry {
  id: string;
  mood: string;
  note: string | null;
  studyMinutes: number;
  createdAt: string;
}

const MOODS = [
  { key: 'great', emoji: '😊', label: 'Great', color: 'bg-green-500' },
  { key: 'good', emoji: '🙂', label: 'Good', color: 'bg-emerald-500' },
  { key: 'okay', emoji: '😐', label: 'Okay', color: 'bg-amber-500' },
  { key: 'bad', emoji: '😕', label: 'Bad', color: 'bg-orange-500' },
  { key: 'terrible', emoji: '😰', label: 'Terrible', color: 'bg-red-500' },
];

function getHeatmapColor(minutes: number, isDark: boolean): string {
  if (minutes === 0) return 'bg-muted';
  if (minutes <= 30) return isDark ? 'bg-emerald-900/40' : 'bg-emerald-200';
  if (minutes <= 60) return isDark ? 'bg-emerald-700/60' : 'bg-emerald-400';
  if (minutes <= 120) return isDark ? 'bg-emerald-600' : 'bg-emerald-500';
  return isDark ? 'bg-emerald-400' : 'bg-emerald-700';
}

function getMotivation(streak: number): { text: string; emoji: string } {
  if (streak === 0) return { text: 'Start your wellness journey today!', emoji: '💪' };
  if (streak <= 3) return { text: "You're building momentum!", emoji: '💪' };
  if (streak <= 7) return { text: 'A full week! Amazing!', emoji: '🔥' };
  if (streak <= 14) return { text: "You're on fire!", emoji: '🌟' };
  return { text: 'Legendary! Keep it up!', emoji: '👑' };
}

export function WellnessView() {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [studyMinutes, setStudyMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const loadData = useCallback(async () => {
    try {
      const [streakRes, moodRes] = await Promise.all([
        fetch('/api/streak'),
        fetch('/api/mood'),
      ]);
      const streakJson = await streakRes.json();
      const moodJson = await moodRes.json();
      setStreakData(streakJson);
      setMoodEntries(moodJson.entries || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveMood = async () => {
    if (!selectedMood) return;
    setSaving(true);
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          note: moodNote.trim() || null,
          studyMinutes: parseInt(studyMinutes) || 0,
        }),
      });
      setShowMoodDialog(false);
      setSelectedMood(null);
      setMoodNote('');
      setStudyMinutes('');
      loadData();
    } catch {}
    finally { setSaving(false); }
  };

  const todayMood = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return moodEntries.find(e => e.createdAt.startsWith(today));
  }, [moodEntries]);

  const motivation = streakData ? getMotivation(streakData.currentStreak) : { text: '', emoji: '' };
  const currentStreak = streakData?.currentStreak || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto h-full overflow-y-auto">

      {/* ── Header ── */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 rounded-3xl blur-2xl" />
        <div className="relative bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl p-6 border border-rose-200/50 dark:border-rose-800/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white fill-white" />
                </div>
                <span className="bg-gradient-to-r from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Mindfulness Hub
                </span>
              </h1>
              <p className="text-sm text-muted-foreground ml-15">
                Track your study journey, mood patterns, and build lasting habits
              </p>
            </div>
            {!todayMood && (
              <Button
                onClick={() => setShowMoodDialog(true)}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2"
                size="lg"
              >
                <Flame className="w-5 h-5" />
                Add Streak
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Mood Entries (TOP) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Recent Mood Entries
                {currentStreak > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold ml-1">
                    <Flame className="w-3 h-3" />
                    Day {currentStreak}
                  </span>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMoodDialog(true)}
                className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <Flame className="w-3.5 h-3.5" />
                Add Streak
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {moodEntries.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Heart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p>No mood entries yet</p>
                <p className="text-xs mt-1">Start tracking your daily mood and well-being</p>
              </div>
            ) : (
              <div className="space-y-2">
                {moodEntries.slice(0, 7).map((entry, idx) => {
                  const mood = MOODS.find(m => m.key === entry.mood);
                  // Calculate streak day for this entry
                  const streakDay = currentStreak - idx;
                  const showStreakDay = streakDay > 0;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-2xl shrink-0">{mood?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0">
                            {mood?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {entry.studyMinutes > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {entry.studyMinutes}m
                            </span>
                          )}
                          {showStreakDay && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                              <Flame className="w-2.5 h-2.5" />
                              Day {streakDay}
                            </span>
                          )}
                        </div>
                        {entry.note && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{entry.note}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            delay: 0.1,
            bg: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
            circle: 'bg-amber-500/10',
            descColor: 'text-amber-700 dark:text-amber-400',
            icon: <Flame className="w-8 h-8 text-amber-500 drop-shadow-lg" />,
            title: 'Current Streak',
            value: (
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                {currentStreak}
              </span>
            ),
            sub: streakData?.todayActive ? (
              <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Active today!</p></>
            ) : (
              <><Clock className="w-3 h-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Study today to continue</p></>
            ),
          },
          {
            delay: 0.2,
            bg: 'from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30',
            circle: 'bg-yellow-500/10',
            descColor: 'text-yellow-700 dark:text-yellow-400',
            icon: <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-lg" />,
            title: 'Longest Streak',
            value: (
              <span className="bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400 bg-clip-text text-transparent">
                {streakData?.longestStreak || 0}
              </span>
            ),
            sub: <><Award className="w-3 h-3 text-yellow-600 dark:text-yellow-400" /><p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Personal best</p></>,
          },
          {
            delay: 0.3,
            bg: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30',
            circle: 'bg-rose-500/10',
            descColor: 'text-rose-700 dark:text-rose-400',
            icon: <span className="text-4xl drop-shadow-lg">{todayMood ? MOODS.find(m => m.key === todayMood.mood)?.emoji : '😊'}</span>,
            title: "Today's Mood",
            value: null,
            sub: <><Smile className="w-3 h-3 text-rose-600 dark:text-rose-400" /><p className="text-xs font-medium text-rose-700 dark:text-rose-400">{todayMood ? MOODS.find(m => m.key === todayMood.mood)?.label : 'Not logged yet'}</p></>,
          },
          {
            delay: 0.4,
            bg: 'from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30',
            circle: 'bg-violet-500/10',
            descColor: 'text-violet-700 dark:text-violet-400',
            icon: <Activity className="w-8 h-8 text-violet-500 drop-shadow-lg" />,
            title: 'This Week',
            value: (
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                {streakData?.thisWeekSessions || 0}
              </span>
            ),
            sub: <><Zap className="w-3 h-3 text-violet-600 dark:text-violet-400" /><p className="text-xs font-medium text-violet-700 dark:text-violet-400">Study sessions</p></>,
          },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stat.delay }}>
            <Card className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${stat.bg}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${stat.circle} rounded-full -translate-y-1/2 translate-x-1/2`} />
              <CardHeader className="pb-2 relative">
                <CardDescription className={`text-xs font-medium ${stat.descColor}`}>{stat.title}</CardDescription>
                <CardTitle className="text-4xl font-bold flex items-center gap-2">
                  {stat.icon}
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">{stat.sub}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Motivation Banner ── */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 opacity-10 blur-xl" />
        <Card className="relative border-0 shadow-xl bg-gradient-to-r from-rose-500/5 via-pink-500/5 to-purple-500/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="text-6xl drop-shadow-lg"
              >
                {motivation.emoji}
              </motion.div>
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 dark:from-rose-400 dark:to-purple-400 bg-clip-text text-transparent mb-1">
                  {motivation.text}
                </h3>
                <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <span>{streakData?.totalActiveDays || 0} total active days</span>
                  </div>
                  {todayMood && todayMood.studyMinutes > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-violet-500" />
                      <span>{todayMood.studyMinutes} minutes studied today</span>
                    </div>
                  )}
                </div>
              </div>
              {!todayMood && (
                <Button
                  onClick={() => setShowMoodDialog(true)}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Flame className="w-4 h-4 mr-2" />
                  Add Streak
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Activity Heatmap ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            Activity Heatmap (Last 90 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-1 min-w-max">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <div key={day} className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{day}</span>
                  <div className="flex gap-1">
                    {streakData?.heatmap
                      .filter((_, i) => i % 7 === idx)
                      .map((d, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div className={`w-3 h-3 rounded-sm ${getHeatmapColor(d.minutes, isDark)} transition-all hover:scale-125 cursor-default`} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs font-medium">{d.date}</p>
                            <p className="text-xs">{d.minutes} min · {d.sessions} sessions</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 30, 60, 120, 180].map((m, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${getHeatmapColor(m, isDark)}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Mood Dialog ── */}
      <AnimatePresence>
        {showMoodDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowMoodDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  Add Your Daily Streak
                </h3>
                <button type="button" onClick={() => setShowMoodDialog(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood.key}
                      type="button"
                      onClick={() => setSelectedMood(mood.key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        selectedMood === mood.key
                          ? 'border-primary bg-primary/5 scale-105'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-3xl">{mood.emoji}</span>
                      <span className="text-[10px] font-medium">{mood.label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Study time today (optional)</label>
                  <Input type="number" placeholder="Minutes" value={studyMinutes} onChange={(e) => setStudyMinutes(e.target.value)} className="h-9" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Note (optional)</label>
                  <Textarea
                    placeholder="How was your day? Any thoughts?"
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowMoodDialog(false)} className="flex-1">Cancel</Button>
                  <Button onClick={saveMood} disabled={!selectedMood || saving} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                    <Flame className="w-4 h-4 mr-1.5" />
                    {saving ? 'Saving...' : 'Add Streak'}
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
