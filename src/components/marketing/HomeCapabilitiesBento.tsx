"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Download,
  MessageCircleMore,
  Package,
  Star,
  Wallet,
  Wrench,
} from "lucide-react";

const items: {
  title: string;
  description: string;
  icon: typeof Package;
  className: string;
}[] = [
  {
    title: "Каталог товарів",
    description: "Картки з фото, ціною та контактом продавця. Швидкий пошук по маркету.",
    icon: Package,
    className: "md:col-span-7 md:min-h-[170px]",
  },
  {
    title: "Послуги та запити",
    description: "Описуйте послуги або шукайте виконавців під задачу.",
    icon: Wrench,
    className: "md:col-span-5 md:min-h-[170px]",
  },
  {
    title: "Імпорт із вашого сайту",
    description: "Один або кілька кліків — товари з онлайн-вітрини в каталозі.",
    icon: Download,
    className: "md:col-span-4",
  },
  {
    title: "Чати й переговори",
    description: "Пишіть контрагентам напряму, домовляйтесь без сторонніх месенджерів.",
    icon: MessageCircleMore,
    className: "md:col-span-4",
  },
  {
    title: "Партнери та обране",
    description: "Зберігайте компанії та будуйте постійні зв’язки.",
    icon: Star,
    className: "md:col-span-4",
  },
  {
    title: "Гаманець і СпівМонети",
    description: "Внутрішня валюта для платежів і обмінів на платформі.",
    icon: Wallet,
    className: "md:col-span-12",
  },
];

export function HomeCapabilitiesBento() {
  const reduce = useReducedMotion();

  const sectionMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.1 },
        transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
      };

  return (
    <motion.section
      className="border-t border-border/60 bg-muted/25 py-14 md:py-20 dark:bg-muted/10"
      {...sectionMotion}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-11 max-w-2xl text-center md:mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Можливості платформи
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Різний розмір карток — як у Bento: головне на виду, решта напівторкає структуру продукту.
          </p>
        </div>

        <div className="grid auto-rows-min grid-cols-1 gap-3 md:grid-cols-12 md:gap-4">
          {items.map(({ title, description, icon: Icon, className }, i) => (
            <motion.div
              key={title}
              layout
              {...(reduce
                ? {}
                : {
                    initial: { opacity: 0, y: 16 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, amount: 0.08 },
                    transition: { duration: 0.4, delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] },
                  })}
              className={`group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-[box-shadow,transform] motion-safe:hover:scale-[1.01] hover:shadow-card-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 ${className}`}
            >
              <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary dark:bg-primary/20 dark:text-[#93c5f9]">
                <Icon className="size-[1.35rem]" aria-hidden strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-semibold leading-snug text-card-foreground">{title}</h3>
              <p className="mt-2 grow text-sm leading-relaxed text-muted-foreground">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
