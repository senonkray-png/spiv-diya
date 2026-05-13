import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import type { EmailTokenType } from "@/types";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Чи налаштована відправка листів (production). */
export function isOutboundEmailConfigured(): boolean {
  if (process.env.EMAIL_WEBHOOK_URL?.trim()) return true;
  if (supabaseEdgeSendConfigured()) return true;
  if (process.env.RESEND_API_KEY?.trim()) return true;
  return false;
}

function supabaseEdgeSendConfigured(): boolean {
  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  return Boolean(base && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function appBaseUrl(): string {
  const base =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const full = base.startsWith("http") ? base : `https://${base}`;
  return full.replace(/\/$/, "");
}

async function sendViaWebhook(args: SendArgs): Promise<{ ok: boolean; provider: "webhook" }> {
  const url = process.env.EMAIL_WEBHOOK_URL!.trim();
  const secret = process.env.EMAIL_WEBHOOK_SECRET?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("EMAIL_WEBHOOK_URL send failed:", res.status, err);
  }
  return { ok: res.ok, provider: "webhook" };
}

/**
 * Виклик Edge Function у Supabase (наприклад `send-auth-email`).
 * У Vercel: SUPABASE_URL або NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
async function sendViaSupabaseEdge(args: SendArgs): Promise<{ ok: boolean; provider: "supabase" }> {
  const baseRaw = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseRaw || !serviceRole) return { ok: false, provider: "supabase" };

  const base = baseRaw.replace(/\/$/, "");
  const fn = process.env.SUPABASE_SEND_EMAIL_FUNCTION?.trim() || "send-auth-email";
  const url = `${base}/functions/v1/${fn}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRole}`,
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Supabase Edge send failed:", res.status, err);
  }
  return { ok: res.ok, provider: "supabase" };
}

async function sendViaResend(args: SendArgs): Promise<{ ok: boolean; provider: "resend" }> {
  const apiKey = process.env.RESEND_API_KEY!.trim();
  const from = process.env.EMAIL_FROM ?? "СпівДія <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html, text: args.text }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend send failed:", res.status, err);
    return { ok: false, provider: "resend" };
  }
  return { ok: true, provider: "resend" };
}

/**
 * Порядок: власний webhook → Supabase Edge Function → Resend → консоль (dev).
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendArgs): Promise<{ ok: boolean; provider: "webhook" | "supabase" | "resend" | "console" }> {
  if (process.env.EMAIL_WEBHOOK_URL?.trim()) {
    return sendViaWebhook({ to, subject, html, text });
  }
  if (supabaseEdgeSendConfigured()) {
    const r = await sendViaSupabaseEdge({ to, subject, html, text });
    if (r.ok) return r;
    // якщо функція не задеплоєна або впала — пробуємо Resend
    if (process.env.RESEND_API_KEY?.trim()) {
      return sendViaResend({ to, subject, html, text });
    }
    return r;
  }
  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend({ to, subject, html, text });
  }

  console.log("\n──────── EMAIL (console fallback) ────────");
  console.log("To:     ", to);
  console.log("Subject:", subject);
  console.log(text ?? html.replace(/<[^>]+>/g, ""));
  console.log("──────────────────────────────────────────\n");
  return { ok: true, provider: "console" };
}

function appUrl(path: string): string {
  return `${appBaseUrl()}${path}`;
}

export async function createEmailToken(args: {
  userId: string;
  email: string;
  type: EmailTokenType;
  ttlMinutes?: number;
}): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const ttl = args.ttlMinutes ?? (args.type === "magic" ? 15 : 60 * 24);
  await prisma.emailToken.create({
    data: {
      userId: args.userId,
      email: args.email,
      token,
      type: args.type,
      expiresAt: new Date(Date.now() + ttl * 60_000),
    },
  });
  return token;
}

export async function sendVerificationEmail(userId: string, email: string, companyName: string) {
  const token = await createEmailToken({ userId, email, type: "verify", ttlMinutes: 60 * 24 });
  const link = appUrl(`/auth/verify?token=${encodeURIComponent(token)}`);
  const sent = await sendEmail({
    to: email,
    subject: "Підтвердіть пошту на СпівДія",
    text: `Привіт, ${companyName}!\n\nПідтвердіть пошту, перейшовши за посиланням:\n${link}\n\nПосилання дійсне 24 години.`,
    html: `
      <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:520px;margin:0 auto">
        <h1 style="font-size:20px;color:#0f172a">Привіт, ${companyName}!</h1>
        <p style="color:#475569;line-height:1.6">Дякуємо, що зареєстрували компанію на платформі <b>СпівДія</b>.<br/>Підтвердіть, будь ласка, свою пошту:</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;display:inline-block">Підтвердити пошту</a>
        </p>
        <p style="color:#94a3b8;font-size:12px">Якщо кнопка не працює, відкрийте: <br/><a href="${link}" style="color:#2563eb;word-break:break-all">${link}</a></p>
        <p style="color:#94a3b8;font-size:12px">Посилання дійсне 24 години.</p>
      </div>
    `,
  });
  return { token, link, ok: sent.ok };
}

export async function sendMagicLinkEmail(userId: string, email: string) {
  const token = await createEmailToken({ userId, email, type: "magic", ttlMinutes: 15 });
  const link = appUrl(`/auth/verify?token=${encodeURIComponent(token)}`);
  const sent = await sendEmail({
    to: email,
    subject: "Швидкий вхід на СпівДія",
    text: `Перейдіть за посиланням, щоб увійти:\n${link}\n\nПосилання дійсне 15 хвилин.`,
    html: `
      <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:520px;margin:0 auto">
        <h1 style="font-size:20px;color:#0f172a">Швидкий вхід</h1>
        <p style="color:#475569;line-height:1.6">Натисніть кнопку нижче, щоб увійти на СпівДія:</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;display:inline-block">Увійти</a>
        </p>
        <p style="color:#94a3b8;font-size:12px">Посилання дійсне 15 хвилин і використовується один раз.</p>
        <p style="color:#94a3b8;font-size:12px">Якщо ви не запитували вхід, просто проігноруйте цей лист.</p>
      </div>
    `,
  });
  return { token, link, ok: sent.ok };
}

export async function consumeEmailToken(token: string) {
  const row = await prisma.emailToken.findUnique({ where: { token } });
  if (!row) return { ok: false, reason: "not_found" as const };
  if (row.usedAt) return { ok: false, reason: "already_used" as const };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" as const };

  await prisma.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return { ok: true as const, userId: row.userId, email: row.email, type: row.type };
}
