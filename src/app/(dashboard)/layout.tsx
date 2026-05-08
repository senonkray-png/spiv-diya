import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ResendVerifyButton } from "@/components/auth/ResendVerifyButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [me, unread] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        role: true,
        companyName: true,
        email: true,
        emailVerified: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
      },
    }),
    prisma.directMessage.count({
      where: { receiverId: session.userId, read: false },
    }),
  ]);

  if (me && me.role === "member" && me.subscriptionPlan === "free") {
    redirect("/welcome");
  }

  const showVerifyBanner = me && !me.emailVerified;
  const showExpiredBanner =
    me?.subscriptionStatus === "expired" && me.subscriptionPlan !== "free";

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        companyName={me?.companyName ?? session.companyName}
        role={me?.role ?? "member"}
        unreadMessages={unread}
      />
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {showVerifyBanner && (
          <div className="border-b border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm text-amber-900 dark:text-amber-200 flex-1">
              Підтвердіть пошту <b>{me.email}</b>, щоб мати повний доступ.
            </p>
            <ResendVerifyButton />
          </div>
        )}
        {showExpiredBanner && (
          <div className="border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm text-red-900 dark:text-red-200 flex-1">
              Ваша підписка завершилась. Поновіть її, щоб знов розміщувати товари і пости.
            </p>
            <Link
              href="/welcome"
              className="text-sm font-semibold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
            >
              Поновити
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
