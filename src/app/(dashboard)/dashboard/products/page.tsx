import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductsBoard } from "@/components/market/ProductsBoard";

export default async function MyProductsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader
        title="Мої товари"
        description="Розміщуйте товари — їх побачать у каталозі та зможуть купити за СпівМонети або написати вам."
      />
      <ProductsBoard ownerId={session.userId} />
    </div>
  );
}
