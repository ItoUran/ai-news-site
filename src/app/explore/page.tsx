import { createClient } from "@/lib/supabase/server";
import { getRecentArticles, getArticlesByIds } from "@/lib/articles";
import { getMyInteractions } from "@/lib/interactions";
import {
  buildUserSignals,
  filterCandidatePool,
  scoreForExplore,
  diversify,
  roundRobinByCategory,
} from "@/lib/recommendation/score";
import { ArticleGrid } from "@/components/article/article-grid";
import type { ArticleWithSource } from "@/types/database";

export const revalidate = 0; // 日替わり乱数シードを使うため都度計算

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pool = await getRecentArticles();
  let articles: ArticleWithSource[];
  let description: string;

  if (!user) {
    articles = roundRobinByCategory(pool).slice(0, 24);
    description =
      "ログインすると、あなたの好みに合わせて探索内容がパーソナライズされます。👍/👎で反応するにはログインが必要です。";
  } else {
    const interactions = await getMyInteractions(user.id);
    const interactedArticles = await getArticlesByIds(interactions.map((i) => i.article_id));
    const articleMap = new Map(interactedArticles.map((a) => [a.id, a]));
    const signals = buildUserSignals(interactions, articleMap);

    const interactedIds = new Set(interactions.map((i) => i.article_id));
    const candidates = filterCandidatePool(pool, interactedIds, signals);

    const dateSeed = new Date().toISOString().slice(0, 10);
    const scored = scoreForExplore(candidates, signals, user.id, dateSeed);
    articles = diversify(scored).slice(0, 24);
    description =
      "普段あまり読まないジャンルの記事をお届けします。気になった記事には👍/👎で反応してみてください。おすすめタブに反映されます。";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">探索</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <ArticleGrid
        articles={articles}
        showLikeDislike
        emptyMessage="表示できる記事がまだありません。しばらくしてから再度お試しください。"
      />
    </div>
  );
}
