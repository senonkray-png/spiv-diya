import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

/** Каталог товарів, імпорт, оголошення послуг — лише продавець / підприємець / адмін. */
export function canManageSellerCatalog(role: string): boolean {
  return role === "provider" || role === "entrepreneur" || role === "admin";
}

/**
 * Returns the currently signed-in user record (fresh from DB) or `null` if
 * the session is missing or invalid. Use in server components / route handlers
 * when you need authoritative role/balance/etc.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  // Lazy-expire subscriptions: if the paid plan ran out, downgrade to free.
  if (
    user.subscriptionPlan !== "free" &&
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt < new Date()
  ) {
    const downgraded = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: "free",
        subscriptionStatus: "expired",
        // Keep role for buyers; demote sellers/entrepreneurs to "buyer"
        role: user.role === "admin" ? "admin" : "buyer",
      },
    });
    await prisma.subscription.updateMany({
      where: { userId: user.id, status: "active" },
      data: { status: "expired" },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "subscription_expiring",
        title: "Підписка завершилась",
        body: "Поновіть підписку, щоб знов мати доступ до повних можливостей.",
        link: "/checkout?plan=" + (user.subscriptionPlan as string),
      },
    });
    return downgraded;
  }

  return user;
}

/**
 * Returns the current user only if they have admin role; otherwise `null`.
 * Use as a gate inside admin-only server components / routes.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "admin") return null;
  return user;
}

/**
 * Throws-shaped helper for API route handlers; returns either the user or a
 * Response object the caller should `return` directly.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false as const,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  return { ok: true as const, user };
}
