import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletPanel } from "@/components/wallet/WalletPanel";

export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [me, transactions, withdrawals, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { balance: true, companyName: true },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <PageHeader
        title="Гаманець"
        description="Поповнюйте баланс, переказуйте партнерам, виводьте на картку."
      />
      <WalletPanel
        balance={me?.balance ?? 0}
        initialTransactions={transactions.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          meta: t.meta as any,
        }))}
        withdrawals={withdrawals.map((w) => ({
          id: w.id,
          amountTokens: w.amountTokens,
          status: w.status,
          createdAt: w.createdAt.toISOString(),
        }))}
        payments={payments.map((p) => ({
          id: p.id,
          method: p.method,
          amountUSD: p.amountUSD,
          amountTokens: p.amountTokens,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
