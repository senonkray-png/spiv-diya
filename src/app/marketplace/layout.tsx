import { getSession } from "@/lib/session";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

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
      <SiteHeader tabs={tabs} isAuthenticated={!!session} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
