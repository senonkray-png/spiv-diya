import { NextResponse } from "next/server";

function appOrigin(): string {
  const base =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return base.replace(/\/$/, "");
}

/** OAuth старт тимчасово вимкнено — лише email + пароль. */
export async function GET() {
  return NextResponse.redirect(new URL("/login?error=oauth_disabled", appOrigin()));
}
