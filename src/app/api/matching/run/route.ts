import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { findMatchesForUser } from "@/lib/matching/auto-matcher";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await findMatchesForUser(session.userId);
  return NextResponse.json({ matched: result.created });
}
