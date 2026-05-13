import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchAndParseProducts } from "@/lib/import/site-importer";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "Вкажіть URL" }, { status: 400 });

  try {
    const items = await fetchAndParseProducts(url, { limit: 30 });
    return NextResponse.json({ items });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 400 },
    );
  }
}
