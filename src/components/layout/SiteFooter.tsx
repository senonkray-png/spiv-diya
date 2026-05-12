import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="font-medium text-foreground hover:underline">
          СпівДія
        </Link>
        <p className="mt-3 leading-relaxed">Платформа кооперації та маркетплейс для бізнесу.</p>
        <p className="mt-2">© {new Date().getFullYear()} СпівДія.</p>
      </div>
    </footer>
  );
}
