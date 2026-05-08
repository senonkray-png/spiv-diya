import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const STATE_COOKIE = "google_oauth_state";

function appOrigin(): string {
  const base =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return base.replace(/\/$/, "");
}

function callbackUrl(): string {
  return `${appOrigin()}/api/auth/google/callback`;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google_config", appOrigin()));
  }

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  const jar = await cookies();
  const savedState = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  if (err) {
    return NextResponse.redirect(new URL("/login?error=google_denied", appOrigin()));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=google_state", appOrigin()));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Google token error:", await tokenRes.text());
    return NextResponse.redirect(new URL("/login?error=google_token", appOrigin()));
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(new URL("/login?error=google_token", appOrigin()));
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=google_profile", appOrigin()));
  }

  const g = (await userRes.json()) as GoogleUserInfo;
  if (!g.sub || !g.email) {
    return NextResponse.redirect(new URL("/login?error=google_profile", appOrigin()));
  }

  const email = g.email.toLowerCase().trim();

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: g.sub }, { email }],
    },
  });

  if (user) {
    if (user.googleId && user.googleId !== g.sub) {
      return NextResponse.redirect(new URL("/login?error=google_account_conflict", appOrigin()));
    }
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: g.sub,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatarUrl: g.picture ?? user.avatarUrl,
        fullName: g.name ?? user.fullName,
      },
    });
  } else {
    const userCount = await prisma.user.count();
    user = await prisma.user.create({
      data: {
        email,
        googleId: g.sub,
        passwordHash: null,
        companyName: g.name?.trim() || email.split("@")[0] || "Google-користувач",
        industry: "—",
        city: "—",
        region: "—",
        role: userCount === 0 ? "admin" : "member",
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatarUrl: g.picture ?? null,
        fullName: g.name ?? null,
      },
    });
  }

  await createSession({
    userId: user.id,
    email: user.email,
    companyName: user.companyName,
    role: user.role,
  });

  const dest =
    user.role === "member" && user.subscriptionPlan === "free"
      ? "/welcome"
      : "/dashboard";
  return NextResponse.redirect(new URL(dest, appOrigin()));
}
