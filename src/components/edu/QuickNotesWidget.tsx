'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, X, Plus, Trash2, Clock, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

interface RecentNote {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const QUICK_COLORS = ['#fef08a', '#86efac', '#93c5fd', '#fca5a5', '#c4b5fd', '#fdba74', '#5eead4'];

export function QuickNotesWidget() {
  const { currentView } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#fef08a');
  const [isSaving, setIsSaving] = useState(false);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);

  const loadRecentNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (data.notes) setRecentNotes(data.notes.slice(0, 3));
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) loadRecentNotes();
  }, [isOpen, loadRecentNotes]);

  // No longer hide on chat view — now works everywhere with smart positioning

  const saveNote = async () => {
    if (!input.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const firstLine = input.trim().split('\n')[0];
      const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '…' : firstLine;

      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Quick Note',
          content: input.trim(),
          color: selectedColor,
        }),
      });

      toast.success('Saved to notes!', {
        description: 'Your note is now in the Notes page',
        duration: 2500,
      });

      setInput('');
      loadRecentNotes();
    } catch {
      toast.error('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      loadRecentNotes();
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveNote();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInput('');
    }
  };

  const close = () => { setIsOpen(false); setInput(''); };

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
            <StickyNote className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Quick Notes</h3>
            <p className="text-[10px] text-muted-foreground">Saves to your Notes page</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={close}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Input Area */}
      <div className="px-3 py-3 border-b space-y-2.5">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jot a quick note... (Enter to save)"
          className="min-h-[80px] max-h-[120px] resize-none text-sm rounded-xl border-border focus:border-emerald-400"
          rows={3}
          autoFocus
        />

        {/* Color picker */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Color:</span>
          <div className="flex gap-1.5">
            {QUICK_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full transition-all shadow-sm ${selectedColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Save button */}
        <Button
          size="sm"
          onClick={saveNote}
          disabled={!input.trim() || isSaving}
          className="w-full h-8 text-xs rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm font-medium"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {isSaving ? 'Saving...' : 'Save to Notes'}
        </Button>
      </div>

      {/* Recent Notes */}
      <div className="max-h-[180px] overflow-y-auto">
        {recentNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <StickyNote className="w-7 h-7 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No notes yet</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Your recent notes will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentNotes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group px-4 py-2.5 hover:bg-muted/30 transition-colors flex items-start gap-2"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: note.color || '#fef08a' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{note.title}</p>
                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {getRelativeTime(note.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t flex items-center justify-center">
        <p className="text-[9px] text-muted-foreground/50 flex items-center gap-1">
          <ArrowUpRight className="w-2.5 h-2.5" />
          Notes are saved to your Notes page
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* ── FAB button (desktop only, hidden on mobile) ── */}
      <div className="hidden sm:block">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fab-button"
              onClick={() => setIsOpen(true)}
              aria-label="Quick Notes"
            >
              <StickyNote className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop panel (≥640px) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* invisible backdrop — desktop only, closes panel on outside click */}
            <div
              className="hidden sm:block fixed inset-0 z-30"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="quick-notes-panel bg-card border border-border shadow-xl hidden sm:block"
            >
              {panelContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom sheet (<640px) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={close}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl overflow-hidden shadow-2xl"
              style={{ maxHeight: '85vh' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 20px)' }}>
                {panelContent}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
