import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const [users, payments, withdrawals, products, services, totalUsers] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, email: true, companyName: true, role: true, isActive: true,
        verified: true, balance: true, city: true, createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["pending", "awaiting_confirmation"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, companyName: true, email: true } } },
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, companyName: true, email: true, balance: true } } },
    }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { owner: { select: { id: true, companyName: true } } },
    }),
    prisma.serviceAd.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { owner: { select: { id: true, companyName: true } } },
    }),
    prisma.user.count(),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader
        title="Адмін-панель"
        description={`Усього користувачів: ${totalUsers}. Керуйте підписниками, платежами і модерацією.`}
      />
      <AdminShell
        initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
        initialPayments={payments.map((p) => ({
          id: p.id,
          method: p.method,
          amountUSD: p.amountUSD,
          amountTokens: p.amountTokens,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          screenshot: p.screenshot,
          user: p.user,
        }))}
        initialWithdrawals={withdrawals.map((w) => ({
          id: w.id,
          amountTokens: w.amountTokens,
          amountUAH: w.amountUAH,
          details: w.details,
          reason: w.reason,
          status: w.status,
          createdAt: w.createdAt.toISOString(),
          user: w.user,
        }))}
        initialProducts={products.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          priceUAH: p.priceUAH,
          priceTokens: p.priceTokens,
          createdAt: p.createdAt.toISOString(),
          owner: p.owner,
        }))}
        initialServices={services.map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          status: s.status,
          createdAt: s.createdAt.toISOString(),
          owner: s.owner,
        }))}
      />
    </div>
  );
}
