"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light");
    } catch {
      // ignore private mode etc.
    }
    setDark(nextDark);
  }

  if (!mounted) {
    return (
      <span
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-[transform,box-shadow,background-color] motion-safe:hover:scale-[1.05] hover:bg-muted/80 hover:shadow-md active:scale-95 motion-reduce:hover:scale-100 ${className}`}
      aria-label={dark ? "Перейти на світлу тему" : "Перейти на темну тему"}
    >
      {dark ? <Sun className="size-[1.125rem]" aria-hidden /> : <Moon className="size-[1.125rem]" aria-hidden />}
    </button>
  );
}
