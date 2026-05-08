import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessagesView } from "@/components/messages/MessagesView";

interface PageProps {
  searchParams: Promise<{ user?: string; to?: string; context?: string; id?: string }>;
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const peer = sp.user ?? sp.to ?? undefined;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader title="Повідомлення" description="Спілкуйтесь напряму з партнерами та клієнтами" />
      <MessagesView
        myId={session.userId}
        initialPeerId={peer}
        initialContext={{ type: sp.context ?? null, id: sp.id ?? null }}
      />
    </div>
  );
}
