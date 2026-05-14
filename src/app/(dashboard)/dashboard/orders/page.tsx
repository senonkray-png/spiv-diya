import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function BuyerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=%2Fdashboard%2Forders");

  const sp = await searchParams;
  const paidId = sp.paid;

  const orders = await prisma.shopOrder.findMany({
    where: { buyerId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      lines: { select: { id: true, title: true, quantity: true, lineTotalTokens: true } },
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <PageHeader
        title="Мої замовлення"
        description="Квитанції зберігаються тут — можна завантажити PDF у будь-який момент."
      />
      {paidId && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
          Замовлення оформлено. Квитанція:{" "}
          <a
            href={`/api/shop/orders/${encodeURIComponent(paidId)}/receipt`}
            className="font-semibold underline"
            target="_blank"
            rel="noreferrer"
          >
            завантажити PDF
          </a>
          .
        </p>
      )}
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ще немає покупок.{" "}
          <Link href="/marketplace/products" className="text-primary underline">
            Каталог товарів
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {o.createdAt.toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{o.id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {o.fulfillment === "delivery" ? "Доставка" : "Самовивіз"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{o.totalTokens} монет</p>
                  <p className="text-xs text-muted-foreground">{o.totalUAH.toLocaleString("uk-UA")} ₴ за позиціями</p>
                </div>
              </div>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {o.lines.map((l) => (
                  <li key={l.id}>
                    {l.title} × {l.quantity}
                  </li>
                ))}
              </ul>
              <a
                href={`/api/shop/orders/${encodeURIComponent(o.id)}/receipt`}
                className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Завантажити квитанцію (PDF)
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
