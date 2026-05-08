import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProductCard } from "@/components/market/ProductCard";
import { ServiceCard } from "@/components/market/ServiceCard";
import { UserPublicActions } from "@/components/users/UserPublicActions";
import { RatingPanel } from "@/components/users/RatingPanel";
import { roleLabelUk } from "@/lib/role-labels";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicUserPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      role: true,
      industry: true,
      businessNiche: true,
      city: true,
      region: true,
      country: true,
      avatarUrl: true,
      bannerUrl: true,
      verified: true,
      websiteUrl: true,
      aboutMe: true,
      interests: true,
      acceptsPartners: true,
      phone: true,
      workPhone: true,
      telegram: true,
      instagram: true,
      facebook: true,
      whatsapp: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) notFound();

  const [products, services] = await Promise.all([
    prisma.product.findMany({
      where: { ownerId: id, status: "active" },
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
      },
    }),
    prisma.serviceAd.findMany({
      where: { ownerId: id, status: "active" },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true, city: true } },
      },
    }),
  ]);

  const isMe = session?.userId === id;
  const isLogged = !!session;

  // Get partnership status if logged in
  let partnership: { id: string; status: string } | null = null;
  if (session && !isMe) {
    const p = await prisma.partnership.findFirst({
      where: {
        OR: [
          { initiatorId: session.userId, targetId: id },
          { initiatorId: id, targetId: session.userId },
        ],
      },
      select: { id: true, status: true },
    });
    partnership = p;
  }

  let isFav = false;
  if (session && !isMe) {
    const f = await prisma.favorite.findFirst({ where: { ownerId: session.userId, userId: id } });
    isFav = !!f;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
        {user.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-16 md:-mt-20 pb-12">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-5 md:p-8">
          <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <Avatar src={user.avatarUrl} name={user.companyName} size="xl" className="md:w-32 md:h-32 ring-4 ring-white dark:ring-zinc-900" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
                    {user.companyName}
                  </h1>
                  {user.verified && <Badge variant="green">Перевірено</Badge>}
                </div>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {user.businessNiche || user.industry}
                  {user.city ? ` · ${user.city}, ${user.region}` : ""}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="blue">{roleLabelUk(user.role)}</Badge>
                  {!user.acceptsPartners && (
                    <Badge variant="neutral">Не приймає запити в партнери</Badge>
                  )}
                </div>
              </div>
            </div>
            <UserPublicActions
              userId={user.id}
              isMe={isMe}
              isLogged={isLogged}
              acceptsPartners={user.acceptsPartners}
              partnership={partnership}
              isFav={isFav}
            />
          </div>

          <div className="mt-6">
            <RatingPanel targetUserId={user.id} isLogged={isLogged} isMe={isMe} />
          </div>

          {user.aboutMe && (
            <div className="mt-6 text-sm md:text-base text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {user.aboutMe}
            </div>
          )}

          {user.interests && user.interests.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {user.interests.map((i) => (
                <Badge key={i} variant="blue" size="sm">
                  {i}
                </Badge>
              ))}
            </div>
          )}

          {/* Contacts */}
          <div className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {user.websiteUrl && (
              <ContactRow label="Сайт">
                <a href={user.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate inline-block max-w-full">
                  {user.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              </ContactRow>
            )}
            {isLogged && user.phone && <ContactRow label="Телефон">{user.phone}</ContactRow>}
            {isLogged && user.workPhone && <ContactRow label="Робочий">{user.workPhone}</ContactRow>}
            {isLogged && user.email && <ContactRow label="Email">{user.email}</ContactRow>}
            {isLogged && user.telegram && <ContactRow label="Telegram">{user.telegram}</ContactRow>}
            {isLogged && user.instagram && <ContactRow label="Instagram">{user.instagram}</ContactRow>}
            {isLogged && user.facebook && <ContactRow label="Facebook">{user.facebook}</ContactRow>}
            {isLogged && user.whatsapp && <ContactRow label="WhatsApp">{user.whatsapp}</ContactRow>}
          </div>

          {!isLogged && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl px-4 py-3 text-sm">
              <Link href="/login" className="text-blue-700 dark:text-blue-300 font-medium hover:underline">
                Увійдіть
              </Link>
              , щоб побачити контакти та зв&apos;язатися з партнером.
            </div>
          )}
        </div>

        {products.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Товари</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {services.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Послуги та запити</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </section>
        )}

        {products.length === 0 && services.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-400">
            У цього підприємства поки немає публічних товарів чи послуг.
          </p>
        )}
      </div>
    </div>
  );
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-zinc-500 w-24 shrink-0">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-white truncate">{children}</span>
    </div>
  );
}
