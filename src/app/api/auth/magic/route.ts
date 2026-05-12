import { NextRequest, NextResponse } from "next/server";

/** Magic link тимчасово вимкнено — вхід лише через email та пароль. */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Вхід за посиланням на пошту тимчасово вимкнено. Скористайтесь паролем." },
    { status: 503 },
  );
}
