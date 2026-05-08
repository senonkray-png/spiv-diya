import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProductActions } from "@/components/market/ProductActions";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  const service = await prisma.serviceAd.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          companyName: true,
          city: true,
          region: true,
          avatarUrl: true,
          verified: true,
          phone: true,
          websiteUrl: true,
          businessNiche: true,
        },
      },
    },
  });

  if (!service || service.status === "removed") notFound();

  let isFav = false;
  if (session) {
    const fav = await prisma.favorite.findFirst({
      where: { ownerId: session.userId, serviceId: id },
    });
    isFav = !!fav;
  }

  const isRequest = service.type === "request";

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
      <Link href="/marketplace/services" className="text-sm text-blue-600 hover:underline">
        ← До послуг
      </Link>

      <div className="mt-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant={isRequest ? "amber" : "blue"}>
            {isRequest ? "Шукаю" : "Пропоную"}
          </Badge>
          {service.category && <Badge variant="neutral">{service.category}</Badge>}
          {service.city && <span className="text-sm text-zinc-500">{service.city}</span>}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
          {service.title}
        </h1>

        <div className="mt-3">
          {service.priceUAH != null ? (
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {service.priceUAH.toLocaleString("uk-UA")} ₴
            </span>
          ) : service.priceTokens != null && service.priceTokens > 0 ? (
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {service.priceTokens} <span className="text-base font-medium text-zinc-500">монет</span>
            </span>
          ) : (
            <span className="text-base font-medium text-zinc-500">Договірна ціна</span>
          )}
        </div>

        <p className="mt-5 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {service.description}
        </p>

        <div className="mt-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 flex items-center gap-3">
          <Avatar src={service.owner.avatarUrl} name={service.owner.companyName} size="md" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/u/${service.owner.id}`}
              className="font-semibold text-zinc-900 dark:text-white truncate hover:text-blue-600"
            >
              {service.owner.companyName}
            </Link>
            <p className="text-xs text-zinc-500 truncate">{service.owner.businessNiche || ""}</p>
          </div>
          {service.owner.verified && <Badge variant="green" size="xs">Перевірено</Badge>}
        </div>

        <ProductActions
          serviceId={service.id}
          ownerId={service.owner.id}
          ownerName={service.owner.companyName}
          isLogged={!!session}
          isOwner={session?.userId === service.owner.id}
          isFav={isFav}
        />
      </div>
    </div>
  );
}
