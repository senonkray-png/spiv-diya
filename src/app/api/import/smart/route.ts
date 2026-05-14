import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";

export const runtime = "nodejs";

interface RawProduct {
  name?: string;
  price?: string;
  image?: string;
  url?: string;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!me || !canManageSellerCatalog(me.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url) return new Response("url required", { status: 400 });

  // Dynamic imports keep webpack from trying to bundle Node built-ins at build time
  const [{ spawn }, { default: path }, { default: fs }] = await Promise.all([
    import("node:child_process"),
    import("node:path"),
    import("node:fs"),
  ]);

  const scriptPath = path.join(process.cwd(), "scripts/analitik-pars.mjs");
  const outputPath = path.join(process.cwd(), "data/smart-results.json");
  const dataDir = path.join(process.cwd(), "data");

  const encoder = new TextEncoder();

  function sse(event: string, data: string) {
    return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
  }

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn("node", [scriptPath, url], {
        env: { ...process.env },
      });

      child.stdout.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString().split("\n").filter(Boolean)) {
          controller.enqueue(sse("log", JSON.stringify({ text: line })));
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString().split("\n").filter(Boolean)) {
          controller.enqueue(sse("log", JSON.stringify({ text: line, isError: true })));
        }
      });

      child.on("close", () => {
        try {
          if (fs.existsSync(outputPath)) {
            const raw = JSON.parse(fs.readFileSync(outputPath, "utf-8")) as RawProduct[];
            const items = raw
              .map((p) => ({
                title: p.name ?? "",
                description: "",
                priceUAH: p.price ? parseInt(p.price) || null : null,
                priceTokens: 0,
                photos: p.image ? [p.image] : [],
                sourceUrl: p.url ?? "",
              }))
              .filter((p) => p.title);
            controller.enqueue(sse("done", JSON.stringify({ items })));
          } else {
            controller.enqueue(sse("done", JSON.stringify({ items: [], error: "Файл результатів не знайдено" })));
          }
        } catch (e) {
          controller.enqueue(sse("done", JSON.stringify({ items: [], error: String(e) })));
        }
        controller.close();
      });

      child.on("error", (err) => {
        controller.enqueue(sse("done", JSON.stringify({ items: [], error: err.message })));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
