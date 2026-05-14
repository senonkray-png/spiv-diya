import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CartView } from "./CartView";

export default async function MarketplaceCartPage() {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/marketplace/cart")}`);
  return <CartView />;
}
