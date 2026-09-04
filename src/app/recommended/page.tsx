import { createClient } from "@/lib/supabase/server";
import { getRecentArticles, getArticlesByIds, getTrendingArticles } from "@/lib/articles";
import { getMyInteractions } from "@/lib/interactions";
import {
  buildUserSignals,
  filterCandidatePool,
  scoreForRecommended,
  diversify,
} from "@/lib/recommendation/score";
import { ArticleGrid } from "@/components/article/article-grid";
import type { ArticleWithSource } from "@/types/database";

export const revalidate = 300;

export default async function RecommendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let articles: ArticleWithSource[];
  let description: string;

  if (!user) {
    articles = await getTrendingArticles(24);
    description = "ログインすると、クリック履歴や探索タブでの「気に入った」に基づいてパーソナライズされます。今は全体の人気記事を表示しています。";
  } else {
    const [pool, interactions] = await Promise.all([
      getRecentArticles(),
      getMyInteractions(user.id),
    ]);
    const interactedArticles = await getArticlesByIds(interactions.map((i) => i.article_id));
    const articleMap = new Map(interactedArticles.map((a) => [a.id, a]));
    const signals = buildUserSignals(interactions, articleMap);

    const interactedIds = new Set(interactions.map((i) => i.article_id));
    const candidates = filterCandidatePool(pool, interactedIds, signals);

    if (interactions.length === 0) {
      articles = await getTrendingArticles(24);
      description = "まだ利用データがありません。記事を読んだり、探索タブで反応すると、あなた向けのおすすめが表示されます。今は全体の人気記事を表示しています。";
    } else {
      const scored = scoreForRecommended(candidates, signals);
      articles = diversify(scored).slice(0, 24);
      description = "クリック履歴と探索タブでの「気に入った」をもとに選んでいます。";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">おすすめ</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <ArticleGrid articles={articles} />
    </div>
  );
}
