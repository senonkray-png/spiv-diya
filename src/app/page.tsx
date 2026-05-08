import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/market/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (session) {
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, subscriptionPlan: true, emailVerified: true, email: true },
    });
    if (me && !me.emailVerified) {
      redirect(`/register/pending?email=${encodeURIComponent(me.email)}`);
    }
    if (me?.role === "member" && me.subscriptionPlan === "free") {
      redirect("/welcome");
    }
    redirect("/dashboard");
  }

  const [products, stats] = await Promise.all([
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
      },
    }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.product.count({ where: { status: "active" } }),
      prisma.serviceAd.count({ where: { status: "active" } }),
    ]),
  ]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-zinc-900 dark:text-white">СпівДія</span>
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/marketplace"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Маркетплейс
            </Link>
            <Link
              href="/login"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Увійти
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Зареєструватись
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12 md:pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-blue-100 dark:border-blue-900">
          Маркетплейс і кооперація для бізнесу
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 dark:text-white leading-tight">
          Усе для вашого бізнесу
          <br />
          <span className="text-blue-600">в одному місці</span>
        </h1>
        <p className="mt-5 md:mt-6 text-base md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Розміщуйте товари та послуги, знаходьте партнерів для співпраці, шукайте підрядників і
          закривайте дефіцити — на одній платформі.
        </p>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Увійти можна паролем або посиланням на email. Після реєстрації — вибір ролі та оформлення підписки для
          продавців і підприємців.
        </p>
        <div className="mt-8 md:mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-medium px-6 py-3 md:px-8 md:py-4 rounded-xl hover:bg-blue-700 transition-colors text-base md:text-lg"
          >
            Безкоштовна реєстрація →
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium px-6 py-3 md:px-8 md:py-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-base md:text-lg"
          >
            Дивитись каталог
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto text-sm">
          <Stat label="Підприємств" value={stats[0]} />
          <Stat label="Товарів" value={stats[1]} />
          <Stat label="Послуг" value={stats[2]} />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16 border-t border-zinc-100 dark:border-zinc-900">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white text-center mb-3">
          Як працює СпівДія
        </h2>
        <p className="text-center text-zinc-500 mb-10 max-w-xl mx-auto">
          Усе спроектовано так, щоб навіть власник без технічної підготовки міг розпочати продавати
          за пару хвилин.
        </p>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {[
            {
              step: "01",
              title: "Заповніть профіль",
              desc: "Назва компанії, ніша, контакти й посилання на ваш сайт. Жодних паперів — все онлайн.",
            },
            {
              step: "02",
              title: "Розмістіть товари або імпортуйте їх із сайту",
              desc: "Додайте товари вручну або вкажіть посилання на ваш магазин — система автоматично зчитає назви, фото й ціни.",
            },
            {
              step: "03",
              title: "Знайдіть партнерів і клієнтів",
              desc: "Шукайте товари, виконавців і однодумців. Спілкуйтесь, додавайте в обране, запрошуйте у партнери.",
            },
          ].map((f) => (
            <div
              key={f.step}
              className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="text-blue-600 font-mono font-bold text-sm mb-3">{f.step}</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                {f.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16 border-t border-zinc-100 dark:border-zinc-900">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white text-center mb-10">
          Все, що потрібно бізнесу
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {[
            {
              t: "Каталог товарів",
              d: "Прості картки з фото, ціною та контактом продавця.",
              icon: "🛍️",
            },
            {
              t: "Послуги та запити",
              d: "Розкажіть, які послуги пропонуєте — або шукайте підрядників.",
              icon: "🤝",
            },
            {
              t: "Імпорт із вашого сайту",
              d: "Один клік — і весь каталог із вашого магазину з'являється тут.",
              icon: "🔗",
            },
            {
              t: "Чати між користувачами",
              d: "Спілкуйтесь напряму, домовляйтесь про умови, надсилайте файли.",
              icon: "💬",
            },
            {
              t: "Партнери та обране",
              d: "Зберігайте цікаві компанії, додавайте у партнери для співпраці.",
              icon: "⭐",
            },
            {
              t: "Гаманець та СпівМонети",
              d: "Внутрішня валюта для розрахунків і обміну ресурсами.",
              icon: "💳",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">{f.t}</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample products */}
      {products.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16 border-t border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
              Свіже на маркетплейсі
            </h2>
            <Link
              href="/marketplace/products"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Усі товари →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-blue-600 py-16 md:py-20 mt-10">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Готові розпочати?</h2>
          <p className="text-blue-100 text-base md:text-lg mb-8">
            Реєстрація займає 1 хвилину. Без паперів і верифікації — додавайте товари відразу.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center bg-white text-blue-600 font-semibold px-6 py-3 md:px-8 md:py-4 rounded-xl hover:bg-blue-50 transition-colors text-base md:text-lg"
          >
            Приєднатись безкоштовно
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-400">
          © 2026 СпівДія. Платформа кооперації та маркетплейс для бізнесу.
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl py-3 px-2">
      <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
