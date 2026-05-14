import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CheckoutView } from "./CheckoutView";

export default async function MarketplaceCheckoutPage() {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/marketplace/checkout")}`);
  return <CheckoutView />;
}
