'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, BookMarked, GraduationCap, Palette, ArrowLeft,
  FileText, StickyNote, Pin, PinOff, Edit3, Save, X, Search,
  BookOpen, Clock, ChevronRight, Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  createdAt: string;
}

interface CourseNote {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const PRESET_COLORS = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6',
  '#6366f1', '#84cc16', '#e11d48', '#0ea5e9',
];

const NOTE_COLORS = [
  '#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3',
  '#ede9fe', '#ffedd5', '#ccfbf1', '#ffffff',
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(dateStr);
}

// ── Course Detail View ────────────────────────────────────────────────────────

function CourseDetail({ course, onBack }: { course: Course; onBack: () => void }) {
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CourseNote | null>(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<CourseNote | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', color: '#fef9c3' });
  const [savingNote, setSavingNote] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/notes?courseId=${course.id}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [course.id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const openAddNote = () => {
    setEditingNote(null);
    setNoteForm({ title: '', content: '', color: '#fef9c3' });
    setNoteDialogOpen(true);
  };

  const openEditNote = (note: CourseNote) => {
    setEditingNote(note);
    setNoteForm({ title: note.title, content: note.content, color: note.color || '#fef9c3' });
    setNoteDialogOpen(true);
  };

  const saveNote = async () => {
    if (!noteForm.title.trim()) return;
    setSavingNote(true);
    try {
      if (editingNote) {
        await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingNote.id, title: noteForm.title, content: noteForm.content, color: noteForm.color }),
        });
      } else {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: noteForm.title, content: noteForm.content, color: noteForm.color, courseId: course.id }),
        });
      }
      setNoteDialogOpen(false);
      fetchNotes();
    } catch { /* silent */ }
    finally { setSavingNote(false); }
  };

  const togglePin = async (note: CourseNote) => {
    try {
      await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id, isPinned: !note.isPinned }),
      });
      fetchNotes();
    } catch { /* silent */ }
  };

  const deleteNote = async () => {
    if (!deleteNoteTarget) return;
    try {
      await fetch(`/api/notes?id=${deleteNoteTarget.id}`, { method: 'DELETE' });
      setDeleteNoteTarget(null);
      fetchNotes();
    } catch { /* silent */ }
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(n => n.isPinned);
  const unpinned = filtered.filter(n => !n.isPinned);

  return (
    <div className="flex flex-col h-full">
      {/* Course header */}
      <div
        className="shrink-0 px-4 sm:px-6 py-4 border-b"
        style={{ borderTopColor: course.color, borderTopWidth: 3 }}
      >
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            All Courses
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
                style={{ backgroundColor: course.color }}
              >
                {course.code.slice(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">{course.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono px-2 py-0"
                    style={{ backgroundColor: `${course.color}18`, color: course.color, borderColor: `${course.color}30` }}
                  >
                    {course.code}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={openAddNote}
              className="text-white shadow-sm shrink-0 self-start sm:self-auto"
              style={{ backgroundColor: course.color }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Search */}
          {notes.length > 2 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl"
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && notes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                style={{ backgroundColor: `${course.color}20` }}
              >
                <StickyNote className="w-7 h-7" style={{ color: course.color }} />
              </div>
              <h3 className="text-base font-semibold mb-1">No notes yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                Add notes, summaries, or study materials for {course.name}
              </p>
              <Button variant="outline" size="sm" className="gap-2" onClick={openAddNote}>
                <Plus className="w-3.5 h-3.5" /> Add First Note
              </Button>
            </motion.div>
          )}

          {/* No search results */}
          {!loading && notes.length > 0 && filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No notes match &ldquo;{search}&rdquo;
            </div>
          )}

          {/* Pinned notes */}
          {pinned.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Pinned
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pinned.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    courseColor={course.color}
                    onEdit={() => openEditNote(note)}
                    onDelete={() => setDeleteNoteTarget(note)}
                    onTogglePin={() => togglePin(note)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All notes */}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Notes
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unpinned.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    courseColor={course.color}
                    onEdit={() => openEditNote(note)}
                    onDelete={() => setDeleteNoteTarget(note)}
                    onTogglePin={() => togglePin(note)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
            <DialogDescription>
              {editingNote ? 'Update your note for' : 'Add a new note to'} {course.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                placeholder="Note title..."
                value={noteForm.title}
                onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                placeholder="Write your notes, summaries, key concepts..."
                value={noteForm.content}
                onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
                className="min-h-[140px] resize-none text-sm"
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Card Color</Label>
              <div className="flex gap-2 flex-wrap">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNoteForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${noteForm.color === c ? 'border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/30' : 'border-border'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={saveNote}
              disabled={!noteForm.title.trim() || savingNote}
              className="text-white"
              style={{ backgroundColor: course.color }}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingNote ? 'Saving...' : editingNote ? 'Save Changes' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete note confirmation */}
      <AlertDialog open={!!deleteNoteTarget} onOpenChange={open => !open && setDeleteNoteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{deleteNoteTarget?.title}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteNote} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  courseColor,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: CourseNote;
  courseColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-xl border border-border/60 overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{ backgroundColor: note.color || '#ffffff' }}
      onClick={onEdit}
    >
      {/* Top accent */}
      <div className="h-0.5 w-full" style={{ backgroundColor: courseColor }} />

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold leading-snug line-clamp-2 flex-1 text-gray-800 dark:text-gray-900">
            {note.title}
          </h4>
          {/* Actions — visible on hover or always on mobile */}
          <div
            className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onTogglePin}
              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              aria-label={note.isPinned ? 'Unpin' : 'Pin'}
            >
              {note.isPinned
                ? <PinOff className="w-3 h-3 text-gray-600" />
                : <Pin className="w-3 h-3 text-gray-500" />}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              aria-label="Edit"
            >
              <Edit3 className="w-3 h-3 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        </div>

        {note.content && (
          <p className="text-xs text-gray-600 dark:text-gray-700 line-clamp-3 leading-relaxed mb-2.5">
            {note.content}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-auto">
          <Clock className="w-2.5 h-2.5 text-gray-400" />
          <span className="text-[10px] text-gray-400">{formatRelative(note.updatedAt)}</span>
          {note.isPinned && (
            <span className="ml-auto">
              <Pin className="w-2.5 h-2.5 text-gray-400" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main CoursesView ──────────────────────────────────────────────────────────

export function CoursesView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', color: '#10b981' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [noteCountMap, setNoteCountMap] = useState<Record<string, number>>({});

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      const list: Course[] = data.courses || [];
      setCourses(list);

      // Fetch note counts for each course in parallel
      const counts = await Promise.all(
        list.map(async (c) => {
          try {
            const r = await fetch(`/api/notes?courseId=${c.id}`);
            const d = await r.json();
            return { id: c.id, count: (d.notes || []).length };
          } catch { return { id: c.id, count: 0 }; }
        })
      );
      const map: Record<string, number> = {};
      counts.forEach(({ id, count }) => { map[id] = count; });
      setNoteCountMap(map);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleAddCourse = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          color: formData.color,
        }),
      });
      if (res.ok) {
        setFormData({ name: '', code: '', color: '#10b981' });
        setDialogOpen(false);
        fetchCourses();
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/courses?id=${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      if (selectedCourse?.id === deleteTarget.id) setSelectedCourse(null);
      fetchCourses();
    } catch { /* silent */ }
  };

  // Show course detail
  if (selectedCourse) {
    return (
      <CourseDetail
        course={selectedCourse}
        onBack={() => { setSelectedCourse(null); fetchCourses(); }}
      />
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-pink-500" />
            My Courses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your courses and study materials by subject.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
              <DialogDescription>
                Add a course to organize your study materials and track progress.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="course-name">Course Name</Label>
                <Input
                  id="course-name"
                  placeholder="e.g., Introduction to Computer Science"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-code">Course Code</Label>
                <Input
                  id="course-code"
                  placeholder="e.g., CS101"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Color
                </Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                        formData.color === c
                          ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background ring-foreground/30'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-pink-500 hover:bg-pink-600 text-white"
                onClick={handleAddCourse}
                disabled={!formData.name.trim() || !formData.code.trim() || submitting}
              >
                {submitting ? 'Adding...' : 'Add Course'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center mb-4 shadow-lg">
            <BookMarked className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-1.5">No Courses Added</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Add your enrolled courses to organize study materials and notes
          </p>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" /> Add Your First Course
          </Button>
        </motion.div>
      )}

      {/* Course grid */}
      {!loading && courses.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {courses.map((course) => (
            <motion.div key={course.id} variants={item}>
              <Card
                className="group relative overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => setSelectedCourse(course)}
              >
                {/* Color accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: course.color }} />

                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: course.color }}
                      >
                        {course.code.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">{course.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className="mt-1 text-[10px] font-mono"
                          style={{
                            backgroundColor: `${course.color}15`,
                            color: course.color,
                            borderColor: `${course.color}30`,
                          }}
                        >
                          {course.code}
                        </Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="h-8 w-8 flex items-center justify-center rounded-lg opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(course); }}
                      aria-label="Delete course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="pb-4">
                  {/* Stats row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <StickyNote className="w-3.5 h-3.5" style={{ color: course.color }} />
                      <span>{noteCountMap[course.id] ?? 0} note{(noteCountMap[course.id] ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Open button */}
                  <div
                    className="flex items-center justify-between text-xs font-medium rounded-lg px-3 py-2 transition-colors"
                    style={{ backgroundColor: `${course.color}12`, color: course.color }}
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Open Course
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-2">
                    Added {formatDate(course.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})?
              This will not delete notes linked to this course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
