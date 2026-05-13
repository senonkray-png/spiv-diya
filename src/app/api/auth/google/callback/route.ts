import { NextRequest, NextResponse } from "next/server";

function appOrigin(): string {
  const base =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return base.replace(/\/$/, "");
}

/** OAuth callback тимчасово вимкнено — прямі заходи перенаправляємо на логін. */
export async function GET(_req: NextRequest) {
  return NextResponse.redirect(new URL("/login?error=oauth_disabled", appOrigin()));
}
