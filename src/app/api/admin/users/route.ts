import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [users, todayCount, weekCount, monthCount, googleCount] = await Promise.all([
      db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          googleId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              chatSessions: true,
              studySessions: true,
              notes: true,
              quizzes: true,
              flashcardDecks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where: { createdAt: { gte: startOfToday } } }),
      db.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.user.count({ where: { googleId: { not: null } } }),
    ]);

    return NextResponse.json({
      stats: {
        total: users.length,
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        googleUsers: googleCount,
        emailUsers: users.length - googleCount,
      },
      users: users.map(u => ({
        id: u.id,
        name: u.name || 'Unknown',
        email: u.email,
        method: u.googleId ? 'Google' : 'Email',
        joinedAt: u.createdAt.toISOString(),
        lastActive: u.updatedAt.toISOString(),
        activity: {
          chats: u._count.chatSessions,
          sessions: u._count.studySessions,
          notes: u._count.notes,
          quizzes: u._count.quizzes,
          flashcards: u._count.flashcardDecks,
        },
      })),
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
