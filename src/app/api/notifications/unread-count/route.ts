import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [unreadMessages, unreadNotifications, unreadOpportunities] = await Promise.all([
    prisma.directMessage.count({
      where: { receiverId: session.userId, read: false },
    }),
    prisma.notification.count({
      where: { userId: session.userId, read: false },
    }),
    prisma.notification.count({
      where: { userId: session.userId, read: false, entityType: "match" },
    }),
  ]);

  return NextResponse.json({ unreadMessages, unreadNotifications, unreadOpportunities });
}
