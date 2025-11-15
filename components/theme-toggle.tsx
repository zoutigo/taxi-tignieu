"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-10 w-20 rounded-full border border-border bg-muted/60" aria-hidden="true" />
    );
  }

  const activeTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";

  const isDark = activeTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Basculer le thème clair/sombre"
      className="relative inline-flex h-10 w-20 items-center rounded-full border border-border bg-muted/60 px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:border-ring hover:bg-muted/80"
    >
      <span
        className={`absolute left-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground shadow-[0_8px_16px_rgba(9,23,45,0.18)] transition-transform duration-200 ${
          isDark ? "translate-x-8" : ""
        }`}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
      <span
        className={`flex-1 text-right pr-1 transition-opacity ${isDark ? "opacity-40" : "opacity-100"}`}
      >
        Jour
      </span>
      <span
        className={`flex-1 pl-1 text-left transition-opacity ${isDark ? "opacity-100" : "opacity-40"}`}
      >
        Nuit
      </span>
    </button>
  );
}
