import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { consumeEmailToken } from "@/lib/email";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return <ErrorPanel title="Немає токена" hint="Посилання неповне. Спробуйте ще раз." />;
  }

  const result = await consumeEmailToken(token);
  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "Посилання не знайдено — можливо, його скопіювали неповністю.",
      already_used: "Це посилання вже використано. Запросіть нове.",
      expired: "Термін дії посилання вичерпано. Запросіть нове.",
    };
    return <ErrorPanel title="Не вдалось увійти" hint={messages[result.reason] ?? "Спробуйте ще раз."} />;
  }

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user) {
    return <ErrorPanel title="Користувача не знайдено" hint="Можливо, акаунт було видалено." />;
  }

  // For verify-tokens — mark email as verified
  if (result.type === "verify" && !user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "email_verified",
        title: "Пошту підтверджено",
        body: "Дякуємо! Тепер ви маєте повний доступ до платформи.",
        link: "/dashboard",
      },
    });
  }

  // For magic-link — sign the user in
  if (result.type === "magic") {
    await createSession({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
    });
    redirect(user.subscriptionPlan === "free" && user.role === "member" ? "/welcome" : "/dashboard");
  }

  // After verify, send to /welcome if role not yet chosen, else dashboard
  redirect(user.role === "member" && user.subscriptionPlan === "free" ? "/welcome" : "/dashboard");
}

function ErrorPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h1>
        <p className="text-sm text-zinc-500 mt-2">{hint}</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">До входу</Link>
          <Link href="/register" className="text-sm font-medium text-zinc-500 hover:underline">Зареєструватись</Link>
        </div>
      </div>
    </div>
  );
}
