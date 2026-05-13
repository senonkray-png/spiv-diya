import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { PartnerInviteForm } from "@/components/partners/PartnerInviteForm";

interface PageProps {
  searchParams: Promise<{ to?: string }>;
}

export default async function NewPartnerRequest({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { to } = await searchParams;
  if (!to) redirect("/marketplace/partners");

  const target = await prisma.user.findUnique({
    where: { id: to },
    select: {
      id: true,
      companyName: true,
      avatarUrl: true,
      businessNiche: true,
      city: true,
      acceptsPartners: true,
    },
  });

  if (!target) notFound();

  return (
    <div className="p-4 md:p-8 max-w-lg">
      <PageHeader title="Запит у партнери" description="Коротко поясніть, чим ваша співпраця буде корисною." />

      <Card padding="md" className="mb-4">
        <div className="flex items-center gap-3">
          <Avatar src={target.avatarUrl} name={target.companyName} size="lg" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/u/${target.id}`}
              className="font-semibold text-zinc-900 dark:text-white truncate hover:text-blue-600 block"
            >
              {target.companyName}
            </Link>
            <p className="text-xs text-zinc-500 truncate">
              {target.businessNiche || ""} · {target.city || ""}
            </p>
          </div>
        </div>
      </Card>

      {!target.acceptsPartners ? (
        <Card padding="md">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Ця компанія наразі не приймає запити в партнери. Спробуйте написати їй у{" "}
            <Link href={`/dashboard/messages?user=${target.id}`} className="text-blue-600 hover:underline">
              чаті
            </Link>
            .
          </p>
        </Card>
      ) : (
        <Card padding="md">
          <PartnerInviteForm targetId={target.id} />
        </Card>
      )}
    </div>
  );
}
