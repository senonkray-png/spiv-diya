import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // AI onboarding is reserved for the entrepreneur tier (per pricing).
  // Admins always have access; other roles get sent through /welcome.
  if (user.role !== "entrepreneur" && user.role !== "admin") {
    redirect("/welcome");
  }

  return <>{children}</>;
}
