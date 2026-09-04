import Link from "next/link";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TabNav } from "./tab-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, LoginButton } from "./user-menu";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.display_name ?? user.email ?? null;
    avatarUrl = profile?.avatar_url ?? null;
  }

  const today = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      {/* ユーティリティバー */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-9 flex items-center justify-between text-xs text-muted-foreground">
          <span>{today}</span>
          <div className="flex items-center gap-3">
            <ThemeToggle isLoggedIn={!!user} />
            {user ? (
              <UserMenu displayName={displayName} avatarUrl={avatarUrl} />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>

      {/* 題字(マストヘッド) */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/explore" className="inline-block">
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            AI<span className="text-primary">ニュース</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            AIが集め、AIが確かめる、あなたのためのニュース
          </p>
        </Link>

        <Link
          href="/radio"
          aria-label="AIニュースラジオを開く"
          title="AIニュースラジオ"
          className="group inline-flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
        >
          <Radio className="size-5 sm:size-6 transition-transform group-hover:rotate-12" />
        </Link>
      </div>

      <TabNav />
    </header>
  );
}
