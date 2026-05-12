"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  as?: "div" | "section";
  className?: string;
};

export function RevealSection({ children, as = "div", className = "" }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    if (as === "section") {
      return <section className={className}>{children}</section>;
    }
    return <div className={className}>{children}</div>;
  }

  const shared = {
    className,
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.12 as const },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
    children,
  };

  if (as === "section") {
    return <motion.section {...shared} />;
  }
  return <motion.div {...shared} />;
}
