'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserActivity {
  chats: number;
  sessions: number;
  notes: number;
  quizzes: number;
  flashcards: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  method: 'Google' | 'Email';
  joinedAt: string;
  lastActive: string;
  activity: UserActivity;
}

interface AdminStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  googleUsers: number;
  emailUsers: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        setError('Incorrect password. Access denied.');
        setPassword('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/30 mb-4 ring-4 ring-emerald-500/20">
            <img src="/fsk-logo.png" alt="Ilmexa AI" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ilmexa AI</h1>
          <p className="text-slate-400 text-sm mt-1">Super Admin Panel</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-slate-300 text-sm font-medium">Admin Access Required</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  required
                  className="w-full bg-slate-900/80 border border-slate-600/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs select-none"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="text-red-400 text-xs">⚠</span>
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              {loading ? 'Verifying…' : 'Access Admin Panel'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Ilmexa AI · Restricted Area
        </p>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">{label}</p>
      <p className="text-3xl font-bold mb-0.5">{value}</p>
      <p className="text-xs opacity-60">{sub}</p>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'Google' | 'Email'>('all');
  const [sortBy, setSortBy] = useState<'joined' | 'active' | 'activity'>('joined');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    onLogout();
  };

  const filtered = users
    .filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchMethod = methodFilter === 'all' || u.method === methodFilter;
      return matchSearch && matchMethod;
    })
    .sort((a, b) => {
      if (sortBy === 'joined') return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      if (sortBy === 'active') return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      const totalA = a.activity.chats + a.activity.sessions + a.activity.notes + a.activity.quizzes + a.activity.flashcards;
      const totalB = b.activity.chats + b.activity.sessions + b.activity.notes + b.activity.quizzes + b.activity.flashcards;
      return totalB - totalA;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/fsk-logo.png" alt="Ilmexa" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <h1 className="font-bold text-sm leading-tight">Ilmexa AI</h1>
              <p className="text-[10px] text-emerald-400 font-medium">Super Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              ↻ Refresh
            </button>
            <button
              onClick={handleLogout}
              className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-800/40 p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Total Users"
              value={stats.total}
              sub="all time"
              color="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            />
            <StatCard
              label="Today"
              value={stats.today}
              sub="new signups"
              color="bg-sky-500/10 border-sky-500/20 text-sky-300"
            />
            <StatCard
              label="This Week"
              value={stats.thisWeek}
              sub="last 7 days"
              color="bg-violet-500/10 border-violet-500/20 text-violet-300"
            />
            <StatCard
              label="This Month"
              value={stats.thisMonth}
              sub="current month"
              color="bg-amber-500/10 border-amber-500/20 text-amber-300"
            />
            <StatCard
              label="Google"
              value={stats.googleUsers}
              sub="OAuth users"
              color="bg-rose-500/10 border-rose-500/20 text-rose-300"
            />
            <StatCard
              label="Email"
              value={stats.emailUsers}
              sub="password users"
              color="bg-teal-500/10 border-teal-500/20 text-teal-300"
            />
          </div>
        )}

        {/* Users Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="px-4 sm:px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Registered Users</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? 'Loading…' : `${filtered.length} of ${users.length} users`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <input
                type="search"
                placeholder="Search name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-full sm:w-52"
              />
              {/* Method filter */}
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value as 'all' | 'Google' | 'Email')}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="all">All Methods</option>
                <option value="Google">Google</option>
                <option value="Email">Email</option>
              </select>
              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'joined' | 'active' | 'activity')}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="joined">Sort: Newest First</option>
                <option value="active">Sort: Last Active</option>
                <option value="activity">Sort: Most Active</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40">
                  <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Active</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 sm:px-5 py-4">
                          <div className="h-4 bg-slate-800 rounded animate-pulse w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-600">
                      {search || methodFilter !== 'all' ? 'No users match your filters.' : 'No users have signed up yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((user, index) => {
                    const totalActivity = user.activity.chats + user.activity.sessions + user.activity.notes + user.activity.quizzes + user.activity.flashcards;
                    return (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 sm:px-5 py-3.5 text-slate-600 text-xs tabular-nums">
                          {index + 1}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white text-sm truncate max-w-[160px]">{user.name}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[160px]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            user.method === 'Google'
                              ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                              : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                          }`}>
                            {user.method === 'Google' ? '🔵' : '✉️'} {user.method}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(user.joinedAt)}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {timeAgo(user.lastActive)}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="flex items-center gap-2.5 text-[11px]">
                            <span title="Chats" className="flex items-center gap-1 text-emerald-400">
                              💬 {user.activity.chats}
                            </span>
                            <span title="Study Sessions" className="flex items-center gap-1 text-orange-400">
                              ⏱ {user.activity.sessions}
                            </span>
                            <span title="Notes" className="flex items-center gap-1 text-sky-400">
                              📝 {user.activity.notes}
                            </span>
                            <span title="Quizzes" className="flex items-center gap-1 text-rose-400">
                              🧠 {user.activity.quizzes}
                            </span>
                            {totalActivity > 0 && (
                              <span className="text-slate-600 text-[10px]">({totalActivity} total)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && users.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-800 text-xs text-slate-600 flex items-center justify-between">
              <span>Showing {filtered.length} of {users.length} users</span>
              <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Root Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authState, setAuthState] = useState<'checking' | 'login' | 'dashboard'>('checking');

  useEffect(() => {
    // Check if already logged in by probing the protected endpoint
    fetch('/api/admin/users')
      .then(res => {
        setAuthState(res.ok ? 'dashboard' : 'login');
      })
      .catch(() => setAuthState('login'));
  }, []);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/fsk-logo.png" alt="Ilmexa AI" className="w-12 h-12 rounded-xl object-cover animate-pulse" />
          <p className="text-slate-500 text-sm">Checking access…</p>
        </div>
      </div>
    );
  }

  if (authState === 'login') {
    return <LoginScreen onLogin={() => setAuthState('dashboard')} />;
  }

  return <AdminDashboard onLogout={() => setAuthState('login')} />;
}
