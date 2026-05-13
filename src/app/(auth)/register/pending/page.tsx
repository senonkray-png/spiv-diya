import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VerifyEmailAgainButton } from "@/components/auth/VerifyEmailAgainButton";
import { VerifyEmailAgainOpenButton } from "@/components/auth/VerifyEmailAgainOpenButton";

export const dynamic = "force-dynamic";

export default async function RegisterPendingPage({
  searchParams,
}: {
  // `email` — одразу після реєстрації (немає сесії); з сесією — з маркетплейсу
  searchParams: Promise<{ email?: string }>;
}) {
  const { email: emailParam } = await searchParams;
  const session = await getSession();

  let email = emailParam?.trim() ?? "";
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, emailVerified: true, role: true, subscriptionPlan: true },
    });
    if (!user) redirect("/login");
    if (user.emailVerified) {
      redirect("/marketplace");
    }
    email = user.email;
  }

  if (!email) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-4 text-2xl">
          ✉️
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Підтвердіть пошту</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Ми надіслали лист на <b className="text-zinc-900 dark:text-white">{email}</b> із посиланням для
          підтвердження. Без цього кроку вхід паролем буде недоступний.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Лист може потрапити у «Спам». Якщо використовуєте Google — можна також увійти одним кліком після
          налаштування кнопки в консолі Google Cloud.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
          {session ? <VerifyEmailAgainButton /> : <VerifyEmailAgainOpenButton email={email} />}
        </div>
        <div className="mt-4">
          {!session && (
            <Link
              href="/login"
              className="text-sm font-medium text-blue-600 hover:underline block"
            >
              У мене вже є підтвердження — до входу
            </Link>
          )}
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/login" className="text-blue-600 hover:underline">
            Повернутись до входу
          </Link>
        </p>
      </div>
    </div>
  );
}
