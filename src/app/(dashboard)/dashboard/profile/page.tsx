import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ResourcesEditor } from "@/components/profile/ResourcesEditor";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { assets: true, deficits: true },
  });

  if (!user) return null;

  const initial = {
    email: user.email,
    balance: user.balance,
    verified: user.verified,
    companyName: user.companyName,
    fullName: user.fullName ?? "",
    industry: user.industry,
    businessNiche: user.businessNiche ?? "",
    city: user.city,
    region: user.region,
    country: user.country ?? "Україна",
    phone: user.phone ?? "",
    workPhone: user.workPhone ?? "",
    websiteUrl: user.websiteUrl ?? "",
    avatarUrl: user.avatarUrl ?? "",
    bannerUrl: user.bannerUrl ?? "",
    aboutMe: user.aboutMe ?? "",
    telegram: user.telegram ?? "",
    instagram: user.instagram ?? "",
    facebook: user.facebook ?? "",
    whatsapp: user.whatsapp ?? "",
    acceptsPartners: user.acceptsPartners,
    role: (user.role === "admin" ? "provider" : user.role) as "member" | "provider" | "buyer",
    interests: user.interests ?? [],
  };

  const lite = (r: typeof user.assets[number]) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    description: r.description,
    city: r.city,
    region: r.region,
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <PageHeader
        title="Профіль"
        description="Як вас побачать партнери у каталозі та маркетплейсі"
        actions={
          <Link
            href={`/u/${user.id}`}
            target="_blank"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Подивитись публічний профіль →
          </Link>
        }
      />

      <ProfileEditor initial={initial} />

      <div className="mt-8 mb-3">
        <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">Ваші ресурси</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          ШІ-агент використовує цей перелік для пошуку партнерів. Будь-які зміни автоматично перевіряються на збіги.
        </p>
      </div>

      <ResourcesEditor
        initialAssets={user.assets.map(lite)}
        initialDeficits={user.deficits.map(lite)}
        defaultCity={user.city}
        defaultRegion={user.region}
      />
    </div>
  );
}
