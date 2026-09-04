import { ArticleCard } from "./article-card";
import type { ArticleWithSource } from "@/types/database";

export function ArticleGrid({
  articles,
  showLikeDislike = false,
  emptyMessage = "まだ記事がありません。収集パイプラインの実行後に表示されます。",
}: {
  articles: ArticleWithSource[];
  showLikeDislike?: boolean;
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
        <ArticleCard key={article.id} article={article} showLikeDislike={showLikeDislike} />
      ))}
    </div>
  );
}
