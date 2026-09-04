"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { TABS } from "@/config/tabs";

const SWIPE_THRESHOLD_PX = 60; // これ未満の移動はスワイプとみなさない
const HORIZONTAL_BIAS = 1.5; // 縦スクロールと誤認しないよう、横方向が縦方向より十分大きい場合のみ反応

const variants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction * 28,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction === 0 ? 0 : -direction * 28,
  }),
};

/**
 * ページ本文を左右にスワイプすると、タブの並び順(config/tabs.ts)で
 * 前後のタブへ移動する。現在のパスがタブ一覧に含まれる場合のみ有効
 * (記事詳細・ログイン・設定ページ等では発火しない)。
 * スマホでの主要な利用を想定するが、タッチ操作であればPCでも動作する。
 *
 * あわせて、タブ切り替え(スワイプ・タブクリックいずれも)を
 * framer-motionでアニメーションさせ、切り替えが唐突に感じないようにする。
 * タブの並び順に対して前へ/後ろへのどちらの移動かをもとにスライド方向を決め、
 * タブ一覧に含まれないページ間の遷移(記事詳細など)ではフェードのみにする。
 */
export function SwipeNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const prevIndexRef = useRef<number | null>(null);
  const [direction, setDirection] = useState(0);

  const currentIndex = TABS.findIndex((tab) => tab.href === pathname);

  useEffect(() => {
    const prevIndex = prevIndexRef.current;
    if (prevIndex != null && currentIndex !== -1 && prevIndex !== -1 && prevIndex !== currentIndex) {
      setDirection(currentIndex > prevIndex ? 1 : -1);
    } else {
      setDirection(0);
    }
    prevIndexRef.current = currentIndex;
  }, [pathname, currentIndex]);

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
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="overflow-x-hidden"
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
