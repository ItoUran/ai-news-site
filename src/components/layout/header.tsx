import Link from "next/link";
import { Radio, Star } from "lucide-react";
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

        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <Link
              href="/bookmarks"
              aria-label="ブックマークを見る"
              title="ブックマーク"
              className="inline-flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            >
              <Star className="size-4 sm:size-5" />
            </Link>
          )}
          <Link
            href="/radio"
            aria-label="AIニュースラジオを開く"
            title="AIニュースラジオ"
            className="inline-flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          >
            <Radio className="size-4 sm:size-5" />
          </Link>
        </div>
      </div>

      <TabNav />
    </header>
  );
}
