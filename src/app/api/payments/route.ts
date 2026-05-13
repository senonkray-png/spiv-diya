import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createBinanceInvoice, createWhitebitInvoice } from "@/lib/payments/providers";

const TOKEN_RATE = parseInt(process.env.TOKEN_RATE ?? "100", 10);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const method = formData.get("method") as string;
  const amountUSD = parseFloat(formData.get("amountUSD") as string);

  if (!method || isNaN(amountUSD) || amountUSD <= 0) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const amountTokens = Math.round(amountUSD * TOKEN_RATE);
  const orderId = `${session.userId}-${Date.now()}`;

  const isStub = (key?: string) => !key || key.startsWith("stub_");

  if (method === "crypto_binance") {
    await prisma.payment.create({
      data: { userId: session.userId, method: "crypto_binance", amountUSD, amountTokens, status: "pending" },
    });
    if (isStub(process.env.BINANCE_CERT_SN)) {
      return NextResponse.json({ checkoutUrl: `https://stub-binance-pay.example.com/pay/${orderId}`, orderId });
    }
    const invoice = await createBinanceInvoice(amountUSD, orderId);
    return NextResponse.json({ checkoutUrl: invoice.address, orderId: invoice.orderId });
  }

  if (method === "crypto_whitebit") {
    await prisma.payment.create({
      data: { userId: session.userId, method: "crypto_whitebit", amountUSD, amountTokens, status: "pending" },
    });
    if (isStub(process.env.WHITEBIT_API_KEY)) {
      return NextResponse.json({ address: `stub-whitebit-address-${orderId}`, orderId });
    }
    const invoice = await createWhitebitInvoice(amountUSD, orderId);
    return NextResponse.json({ address: invoice.address, orderId: invoice.orderId });
  }

  if (method === "p2p_screenshot") {
    // Screenshot upload — store as base64 or handle separately
    const screenshotFile = formData.get("screenshot") as File | null;
    let screenshotUrl: string | undefined;

    if (screenshotFile) {
      // In production: upload to S3/Cloudflare R2
      // For now, use a placeholder
      screenshotUrl = `screenshot-${orderId}`;
    }

    await prisma.payment.create({
      data: {
        userId: session.userId,
        method: "p2p_screenshot",
        amountUSD,
        amountTokens,
        status: "awaiting_confirmation",
        screenshot: screenshotUrl,
      },
    });

    return NextResponse.json({ pending: true, message: "Заявку прийнято, очікуйте підтвердження." });
  }

  if (method === "p2p_manual") {
    await prisma.payment.create({
      data: {
        userId: session.userId,
        method: "p2p_manual",
        amountUSD,
        amountTokens,
        status: "pending",
      },
    });
    return NextResponse.json({ pending: true, message: "Заявку прийнято. Зверніться до підтримки." });
  }

  return NextResponse.json({ error: "Unknown method" }, { status: 400 });
}

// Admin: confirm a payment
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId } = await req.json();

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "confirmed", confirmedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: payment.userId },
      data: { balance: { increment: payment.amountTokens } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
