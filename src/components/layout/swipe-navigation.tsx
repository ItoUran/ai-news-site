"use client";

import { useRef, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TABS } from "@/config/tabs";

const SWIPE_THRESHOLD_PX = 60; // これ未満の移動はスワイプとみなさない
const HORIZONTAL_BIAS = 1.5; // 縦スクロールと誤認しないよう、横方向が縦方向より十分大きい場合のみ反応

/**
 * ページ本文を左右にスワイプすると、タブの並び順(config/tabs.ts)で
 * 前後のタブへ移動する。現在のパスがタブ一覧に含まれる場合のみ有効
 * (記事詳細・ログイン・設定ページ等では発火しない)。
 * スマホでの主要な利用を想定するが、タッチ操作であればPCでも動作する。
 */
export function SwipeNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const currentIndex = TABS.findIndex((tab) => tab.href === pathname);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current || currentIndex === -1) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_BIAS
    ) {
      return; // 移動量不足、または縦スクロールと判断
    }

    // 左スワイプ(指を左へ)= 次のタブへ、右スワイプ = 前のタブへ
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextTab = TABS[nextIndex];
    if (nextTab) router.push(nextTab.href);
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}
