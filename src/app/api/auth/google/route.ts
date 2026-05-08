import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";

const STATE_COOKIE = "google_oauth_state";
const STATE_MAX_AGE = 600;

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

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=google_config", appOrigin()));
  }

  const state = crypto.randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_MAX_AGE,
    path: "/",
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "offline");

  return NextResponse.redirect(url.toString());
}
