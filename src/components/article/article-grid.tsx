import { ArticleCard } from "./article-card";
import type { ArticleWithSource } from "@/types/database";

export function ArticleGrid({
  articles,
  showReactions = false,
  initialBookmarked = false,
  emptyMessage = "まだ記事がありません。収集パイプラインの実行後に表示されます。",
}: {
  articles: ArticleWithSource[];
  showReactions?: boolean;
  /** 一覧内の全記事に共通の初期ブックマーク状態(例: ブックマーク一覧ページでは全件true) */
  initialBookmarked?: boolean;
  emptyMessage?: string;
}) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          showReactions={showReactions}
          initialBookmarked={initialBookmarked}
        />
      ))}
    </div>
  );
}
