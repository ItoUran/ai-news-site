"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 記事詳細ページの「詳しく」ボタン。押すと /api/articles/[id]/deep-dive を叩き、
 * AIによる深掘り解説を取得して展開表示する(取得済みならAPI側でキャッシュを返すだけなので、
 * 2回目以降のクリックは追加のAI呼び出しを発生させない)。
 */
export function DeepDiveSection({
  articleId,
  initialText,
}: {
  articleId: string;
  initialText: string | null;
}) {
  const [text, setText] = useState<string | null>(initialText);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (text) {
      setExpanded((e) => !e);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/deep-dive`, { method: "POST" });
      if (res.status === 429) {
        setError("本日の生成上限に達しました。日付が変わってから再度お試しください。");
        return;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { detailedExplanation: string };
      setText(data.detailedExplanation);
      setExpanded(true);
    } catch {
      setError("詳細解説の生成に失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            AIが詳しく解説を作成中...
          </>
        ) : expanded && text ? (
          <>
            <ChevronUp className="size-3.5" />
            閉じる
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            詳しく
          </>
        )}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {expanded && text && (
        <div className="rounded-xl bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">
          {text}
        </div>
      )}
    </div>
  );
}
