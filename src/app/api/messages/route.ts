import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

/**
 * GET /api/messages
 *   - no params  → list of conversations (one per peer with latest msg)
 *   - ?with=ID   → full thread between me and ID (chronological, marks read)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const peer = url.searchParams.get("with");

  if (peer) {
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.userId, receiverId: peer },
          { senderId: peer, receiverId: session.userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    // Mark received messages as read
    await prisma.directMessage.updateMany({
      where: { senderId: peer, receiverId: session.userId, read: false },
      data: { read: true },
    });

    const peerUser = await prisma.user.findUnique({
      where: { id: peer },
      select: { id: true, companyName: true, avatarUrl: true, businessNiche: true, verified: true },
    });

    return NextResponse.json({ messages, peer: peerUser });
  }

  // Conversation list — group by other user
  const myId = session.userId;
  const recent = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: myId }, { receiverId: myId }] },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const map = new Map<string, { peerId: string; lastMessage: typeof recent[number]; unread: number }>();
  for (const m of recent) {
    const peerId = m.senderId === myId ? m.receiverId : m.senderId;
    const entry = map.get(peerId);
    if (!entry) {
      map.set(peerId, {
        peerId,
        lastMessage: m,
        unread: m.receiverId === myId && !m.read ? 1 : 0,
      });
    } else if (m.receiverId === myId && !m.read) {
      entry.unread += 1;
    }
  }

  const peerIds = Array.from(map.keys());
  const peers = await prisma.user.findMany({
    where: { id: { in: peerIds } },
    select: { id: true, companyName: true, avatarUrl: true, businessNiche: true, verified: true },
  });

  // Sort peers by last activity (already in `recent` order)
  const conversations = Array.from(map.values()).map((c) => ({
    ...c,
    peer: peers.find((p) => p.id === c.peerId) ?? null,
  }));

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const to = String(body?.to ?? "");
  const content = String(body?.content ?? "").trim();
  const contextType = body?.contextType ? String(body.contextType).slice(0, 30) : null;
  const contextId = body?.contextId ? String(body.contextId).slice(0, 100) : null;

  if (!to || !content) {
    return NextResponse.json({ error: "Missing recipient or content" }, { status: 400 });
  }
  if (to === session.userId) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: to } });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const message = await prisma.directMessage.create({
    data: {
      senderId: session.userId,
      receiverId: to,
      content,
      contextType,
      contextId,
    },
  });

  await prisma.notification.create({
    data: {
      userId: to,
      type: "message",
      title: "Нове повідомлення",
      body: content.slice(0, 200),
      link: `/dashboard/messages?user=${session.userId}`,
    },
  });

  return NextResponse.json({ message });
}
