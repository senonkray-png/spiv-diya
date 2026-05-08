import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ServicesBoard } from "@/components/market/ServicesBoard";

export default async function MyServicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader
        title="Мої послуги"
        description="Розмістіть, що ви пропонуєте, або створіть запит — і знаходьте партнерів швидше."
      />
      <ServicesBoard ownerId={session.userId} />
    </div>
  );
}
