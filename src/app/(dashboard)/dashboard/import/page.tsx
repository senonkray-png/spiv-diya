import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog, getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ImportClient } from "@/components/import/ImportClient";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageSellerCatalog(user.role)) redirect("/welcome");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { websiteUrl: true },
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <PageHeader
        title="Імпорт товарів зі свого сайту"
        description="Вставте посилання на магазин і натисніть «Отримати товари з сайту» — підтягнемо список товарів (sitemap і посилання), фото, назву, опис, ціну та фасовку/розміри з мікророзмітки, якщо вони є."
      />

      <Card padding="md" className="mb-4 bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <strong>Як це працює:</strong> збираємо адреси з <code className="rounded bg-white/60 px-1 text-xs dark:bg-zinc-900/80">sitemap.xml</code>,{" "}
          <code className="rounded bg-white/60 px-1 text-xs dark:bg-zinc-900/80">robots.txt</code> та посилань на головній/каталозі, потім
          зчитуємо до ~90 карток товарів. Підтримуються Schema.org Product (ціна, зображення, additionalProperty, вага/габарити) та OpenGraph.
          Сайти лише на JavaScript або з жорстким антиботом можуть не віддати HTML — тоді скористайтесь режимом «Лише ця сторінка» на
          відкритій картці товару або додайте товари вручну.
        </p>
      </Card>

      <ImportClient defaultUrl={me?.websiteUrl ?? ""} />
    </div>
  );
}
