import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBookmarkedArticles } from "@/lib/articles";
import { ArticleGrid } from "@/components/article/article-grid";

export const revalidate = 0; // 常に最新のブックマーク状態を表示する

export default async function BookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/bookmarks");

  const articles = await getMyBookmarkedArticles(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">ブックマーク</h2>
        <p className="text-sm text-muted-foreground mt-1">
          あなたがブックマークした記事の一覧です。記事カードのブックマークボタンで追加・解除できます。
        </p>
      </div>
      <ArticleGrid
        articles={articles}
        showReactions
        initialBookmarked
        emptyMessage="まだブックマークした記事がありません。記事カードのブックマークボタンから追加できます。"
      />
    </div>
  );
}
