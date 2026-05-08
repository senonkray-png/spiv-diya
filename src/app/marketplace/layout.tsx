import Link from "next/link";
import { getSession } from "@/lib/session";

const tabs = [
  { href: "/marketplace", label: "Огляд" },
  { href: "/marketplace/products", label: "Товари" },
  { href: "/marketplace/services", label: "Послуги" },
  { href: "/marketplace/partners", label: "Партнери" },
];

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="text-lg font-bold text-zinc-900 dark:text-white shrink-0">
            СпівДія
          </Link>
          <nav className="hidden sm:flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="text-sm font-medium px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {session ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Кабінет
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                >
                  Вхід
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                >
                  Реєстрація
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="sm:hidden border-t border-zinc-200 dark:border-zinc-800">
          <nav className="max-w-7xl mx-auto px-2 py-1 flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 whitespace-nowrap"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-sm text-zinc-400">
          © 2026 СпівДія. Маркетплейс кооперації для бізнесу.
        </div>
      </footer>
    </div>
  );
}
