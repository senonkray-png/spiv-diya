import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ImportClient } from "@/components/import/ImportClient";

export default async function ImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { websiteUrl: true },
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <PageHeader
        title="Імпорт товарів зі свого сайту"
        description="Вкажіть посилання на ваш сайт або сторінку товару — ми спробуємо зчитати назву, опис, ціну та фото автоматично."
      />

      <Card padding="md" className="mb-4 bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <strong>Як це працює:</strong> ми зчитаємо HTML вашої сторінки та шукатимемо стандартні
          мікророзмітки (Schema.org / OpenGraph). Якщо ваш сайт використовує популярні движки
          (Хорошоп, Prom, Tilda, WooCommerce, Shopify) — імпорт спрацює без додаткових налаштувань.
          Підкоригувати імпортовані товари можна перед збереженням.
        </p>
      </Card>

      <ImportClient defaultUrl={me?.websiteUrl ?? ""} />
    </div>
  );
}
