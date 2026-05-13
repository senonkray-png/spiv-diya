import { getSession } from "@/lib/session";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/marketplace", label: "Огляд" },
  { href: "/marketplace/products", label: "Товари" },
  { href: "/marketplace/services", label: "Послуги" },
  { href: "/marketplace/partners", label: "Партнери" },
];

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceShell isAuthenticated={!!session}>
        <SiteHeader tabs={tabs} isAuthenticated={!!session} />
        <div className="pb-[4.75rem] lg:pb-0">
          <main>{children}</main>
          <SiteFooter />
        </div>
      </MarketplaceShell>
    </div>
  );
}
