"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * 記事詳細ページの左上に置く「戻る」ボタン。
 * 通常はブラウザ履歴を1つ戻るが、直接この記事にアクセスした等で戻り先が
 * 無い場合(history.length <= 1)は探索タブへフォールバックする。
 */
export function BackButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/explore");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      戻る
    </button>
  );
}
