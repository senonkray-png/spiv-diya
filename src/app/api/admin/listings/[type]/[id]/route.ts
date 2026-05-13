import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ type: string; id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type: typeParam, id } = await params;
  if (typeParam !== "product" && typeParam !== "service") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const type = typeParam as "product" | "service";
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

  const status = action === "remove" ? "removed" : action === "restore" ? "active" : null;
  if (!status) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  if (type === "product") {
    const updated = await prisma.product.update({
      where: { id },
      data: { status, removedReason: status === "removed" ? reason : null },
    });
    await prisma.notification.create({
      data: {
        userId: updated.ownerId,
        type: status === "removed" ? "product_removed" : "system",
        title: status === "removed" ? "Товар знято з публікації" : "Товар відновлено",
        body: reason ?? "",
        entityType: "product",
        entityId: id,
        link: "/dashboard/products",
      },
    });
  } else {
    const updated = await prisma.serviceAd.update({
      where: { id },
      data: { status, removedReason: status === "removed" ? reason : null },
    });
    await prisma.notification.create({
      data: {
        userId: updated.ownerId,
        type: status === "removed" ? "service_removed" : "system",
        title: status === "removed" ? "Послугу знято" : "Послугу відновлено",
        body: reason ?? "",
        entityType: "service",
        entityId: id,
        link: "/dashboard/services",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
