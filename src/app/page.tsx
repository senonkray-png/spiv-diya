import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-zinc-900 dark:text-white">СпівДія</span>
          <div className="flex items-center gap-3">
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
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-blue-100 dark:border-blue-900">
          B2B-платформа прямої кооперації
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white leading-tight">
          Закрийте дефіцити
          <br />
          <span className="text-blue-600">разом з партнерами</span>
        </h1>
        <p className="mt-6 text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          СпівДія — платформа де виробники обмінюються ресурсами: обладнанням,
          площами, сировиною і відділами продажів, щоб разом стати сильнішими.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-medium px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors text-lg"
          >
            Почати безкоштовно →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium px-8 py-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-lg"
          >
            Увійти
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-100 dark:border-zinc-900">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white text-center mb-12">
          Як це працює
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Розкажіть про себе",
              desc: "ШІ-агент проведе коротке інтерв'ю та сформує ваш профіль активів і дефіцитів.",
            },
            {
              step: "02",
              title: "Знайдіть партнерів",
              desc: "Алгоритм знаходить прямий метч або будує ланцюжок обміну з 3+ учасників.",
            },
            {
              step: "03",
              title: "Укладіть угоду",
              desc: "Погодьте умови у внутрішньому чаті або отримайте PDF-драфт угоди про наміри.",
            },
          ].map((f) => (
            <div
              key={f.step}
              className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="text-blue-600 font-mono font-bold text-sm mb-3">{f.step}</div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                {f.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-100 dark:border-zinc-900">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white text-center mb-4">
          Що можна обміняти
        </h2>
        <p className="text-center text-zinc-500 mb-10">
          Будь-які ресурси між підприємствами
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "Виробниче обладнання",
            "Вільні площі",
            "Логістика",
            "Сировина",
            "Відділ продажів",
            "Маркетинг",
            "Персонал",
          ].map((cat) => (
            <span
              key={cat}
              className="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium bg-white dark:bg-zinc-900"
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20 mt-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Готові закрити дефіцити?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Реєстрація займає 2 хвилини. ШІ-агент допоможе скласти профіль.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors text-lg"
          >
            Приєднатись безкоштовно
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-400">
          © 2024 СпівДія. Платформа B2B кооперації.
        </div>
      </footer>
    </div>
  );
}
