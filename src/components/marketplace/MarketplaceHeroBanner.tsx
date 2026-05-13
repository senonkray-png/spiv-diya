"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const slides = [
  {
    title: "Маркетплейс кооперації",
    subtitle: "Товари від перевірених підприємців по всій Україні",
    cta: { href: "/marketplace/products", label: "Усі товари" },
    className: "from-violet-600 to-purple-800",
  },
  {
    title: "Партнери та послуги",
    subtitle: "Знайдіть постачальників, виконавців і нові канали збуту",
    cta: { href: "/marketplace/partners", label: "Партнери" },
    className: "from-indigo-600 to-violet-800",
  },
  {
    title: "Почніть продавати",
    subtitle: "Розмістіть товари або імпортуйте зі свого сайту",
    cta: { href: "/register", label: "Реєстрація" },
    className: "from-fuchsia-600 to-violet-900",
  },
];

export function MarketplaceHeroBanner() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, []);

  const s = slides[i]!;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br ${s.className} text-white shadow-lg`}
    >
      <div className="px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto text-center">
        <p className="text-sm font-medium text-white/85 mb-2">СпівДія</p>
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{s.title}</h1>
        <p className="mt-3 text-sm md:text-lg text-white/90">{s.subtitle}</p>
        <div className="mt-6 flex justify-center">
          <Link
            href={s.cta.href}
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-violet-800 shadow hover:bg-violet-50 transition-colors"
          >
            {s.cta.label}
          </Link>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 pb-4">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Слайд ${idx + 1}`}
            onClick={() => setI(idx)}
            className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-2 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
