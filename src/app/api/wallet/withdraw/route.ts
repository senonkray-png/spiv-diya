import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const amount = Math.round(Number(body?.amountTokens ?? 0));
  const details = String(body?.details ?? "").trim();
  const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

  if (!amount || amount <= 0) return NextResponse.json({ error: "Невірна сума" }, { status: 400 });
  if (!details) return NextResponse.json({ error: "Вкажіть реквізити" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.balance < amount) return NextResponse.json({ error: "Недостатньо коштів" }, { status: 402 });

  const TOKEN_RATE = parseInt(process.env.TOKEN_RATE ?? "100", 10);
  const amountUAH = Math.round((amount / TOKEN_RATE) * 41); // approx UAH/USD

  const wr = await prisma.withdrawalRequest.create({
    data: {
      userId: me.id,
      amountTokens: amount,
      amountUAH,
      details: details.slice(0, 500),
      reason,
    },
  });

  return NextResponse.json({ withdrawal: wr });
}
