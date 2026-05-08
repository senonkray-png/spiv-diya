import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [me, unread] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, companyName: true },
    }),
    prisma.directMessage.count({
      where: { receiverId: session.userId, read: false },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        companyName={me?.companyName ?? session.companyName}
        role={me?.role ?? "member"}
        unreadMessages={unread}
      />
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">{children}</main>
    </div>
  );
}
