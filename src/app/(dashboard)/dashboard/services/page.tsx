import { redirect } from "next/navigation";
import { canManageSellerCatalog, getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ServicesBoard } from "@/components/market/ServicesBoard";

export default async function MyServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageSellerCatalog(user.role)) redirect("/welcome");

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader
        title="Мої послуги"
        description="Розмістіть, що ви пропонуєте, або створіть запит — і знаходьте партнерів швидше."
      />
      <ServicesBoard ownerId={user.id} />
    </div>
  );
}
