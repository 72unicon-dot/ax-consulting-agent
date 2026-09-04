"use client";

import { useSyncExternalStore, useEffect } from "react";

type Theme = "system" | "light" | "dark";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribeToThemeStore(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === "theme") onChange();
  };
  const onCustom = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener("theme:changed", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("theme:changed", onCustom);
  };
}

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = theme === "dark" || (theme === "system" && systemDark);
  el.classList.toggle("dark", useDark);
}

export function ThemeToggle() {
  // useSyncExternalStore is the sanctioned hydration-safe way to read
  // localStorage: the server snapshot ("system") is stable, and after
  // hydration React switches to the client snapshot without a setState
  // inside an effect.
  const theme = useSyncExternalStore<Theme>(
    subscribeToThemeStore,
    readStoredTheme,
    () => "system",
  );

  // When in system mode, follow OS-level scheme changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    const next: Theme =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    if (next === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", next);
    }
    applyTheme(next);
    // Same-tab writes don't fire the "storage" event, so nudge our subscriber.
    window.dispatchEvent(new Event("theme:changed"));
  }

  const label =
    theme === "system"
      ? "🖥️ 시스템"
      : theme === "light"
        ? "☀️ 라이트"
        : "🌙 다크";

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      aria-label="테마 전환"
      title="시스템 → 라이트 → 다크 순으로 전환"
    >
      {label}
    </button>
  );
}
