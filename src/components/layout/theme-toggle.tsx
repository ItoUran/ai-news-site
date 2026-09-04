"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    if (isLoggedIn) {
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_preference: next }),
      }).catch(() => {});
    }
  }

  return (
    <Button variant="ghost" size="icon" aria-label="ダークモード切り替え" onClick={toggle}>
      {/* サーバー/クライアントの初回レンダーで theme が確定しないため、
          JSの状態分岐ではなくCSS(.darkクラス)で表示を切り替え、ハイドレーション不一致を避ける */}
      <Sun className="size-4 hidden dark:inline-block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
