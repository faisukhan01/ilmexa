import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

// GET: all conversations (summary) or single conversation by ?id=
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const conv = await db.chatSession.findFirst({
        where: { id, userId: session.userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      return NextResponse.json({
        id: conv.id,
        title: conv.title,
        messages: conv.messages.map(m => ({ role: m.role, content: m.content })),
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
      });
    }

    const convs = await db.chatSession.findMany({
      where: { userId: session.userId },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(
      convs.map(c => ({
        id: c.id,
        title: c.title,
        messageCount: c._count.messages,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error('chat-history GET:', err);
    return NextResponse.json({ error: 'Failed to read conversations' }, { status: 500 });
  }
}

// POST: create new conversation
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, messages } = await request.json() as {
      title?: string;
      messages?: Array<{ role: string; content: string }>;
    };

    const conv = await db.chatSession.create({
      data: {
        userId: session.userId,
        title: title || 'Untitled',
        messages: messages && messages.length > 0
          ? { create: messages.map(m => ({ role: m.role, content: m.content })) }
          : undefined,
      },
    });

    return NextResponse.json({ id: conv.id, title: conv.title }, { status: 201 });
  } catch (err) {
    console.error('chat-history POST:', err);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

// PUT: update messages of an existing conversation
export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, messages } = await request.json() as {
      id: string;
      messages: Array<{ role: string; content: string }>;
    };
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await db.chatSession.findFirst({ where: { id, userId: session.userId } });
    if (!existing) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // Replace all messages atomically
    await db.$transaction([
      db.chatMessage.deleteMany({ where: { sessionId: id } }),
      db.chatSession.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          messages: { create: (messages || []).map(m => ({ role: m.role, content: m.content })) },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('chat-history PUT:', err);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

// DELETE: remove a conversation
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json() as { id: string };
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await db.chatSession.findFirst({ where: { id, userId: session.userId } });
    if (!existing) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    await db.chatSession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('chat-history DELETE:', err);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
