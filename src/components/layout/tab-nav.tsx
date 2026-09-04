"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/explore", label: "探索" },
  { href: "/recommended", label: "おすすめ" },
  { href: "/domestic", label: "国内ニュース" },
  { href: "/domestic-politics", label: "国内政治" },
  { href: "/international", label: "国際ニュース" },
  { href: "/international-politics", label: "国際政治" },
  { href: "/it", label: "IT" },
  { href: "/radio", label: "ラジオ" },
  { href: "/weather", label: "気象予報" },
] as const;

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border overflow-x-auto">
      <ul className="flex max-w-6xl mx-auto px-4 gap-1 min-w-max">
        {TABS.map((tab) => {
          // startsWith だと "/domestic-politics" が "/domestic" にも一致してしまうため、
          // 記事詳細ページ等サブパスを持つ可能性を考慮しつつ完全一致で判定する
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "inline-block px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
