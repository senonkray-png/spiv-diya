import { redirect } from "next/navigation";
import { canManageSellerCatalog, getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductsBoard } from "@/components/market/ProductsBoard";

export default async function MyProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageSellerCatalog(user.role)) redirect("/welcome");

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader
        title="Мої товари"
        description="Розміщуйте товари — їх побачать у каталозі та зможуть купити за СпівМонети або написати вам."
      />
      <ProductsBoard ownerId={user.id} role={user.role} />
    </div>
  );
}
