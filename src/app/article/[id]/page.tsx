import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { getArticleById } from "@/lib/articles";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/types/article";
import { categoryPlaceholderThumbnail } from "@/lib/thumbnail";
import { LikeDislikeButtons } from "@/components/article/like-dislike-buttons";
import { BackButton } from "@/components/article/back-button";

export const revalidate = 300;

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const meta = CATEGORY_META[article.category];
  const relativeTime = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ja })
    : null;

  // ログイン中なら閲覧を記録する(おすすめ/探索スコアリングの入力)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("user_article_interactions")
      .select("view_count, first_viewed_at")
      .eq("user_id", user.id)
      .eq("article_id", article.id)
      .maybeSingle();

    const now = new Date().toISOString();
    await supabase.from("user_article_interactions").upsert(
      {
        user_id: user.id,
        article_id: article.id,
        view_count: (existing?.view_count ?? 0) + 1,
        first_viewed_at: existing?.first_viewed_at ?? now,
        last_viewed_at: now,
      },
      { onConflict: "user_id,article_id" },
    );
  }

  return (
    <article className="max-w-3xl mx-auto flex flex-col gap-5">
      <BackButton />

      <div className="flex items-center gap-2">
        <Badge className={meta.badgeClass}>{meta.label}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          AIファクトチェック済み
        </span>
      </div>

      <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">
        {article.translated_title}
      </h1>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium">{article.source?.name ?? "不明なソース"}</span>
        {relativeTime && (
          <>
            <span aria-hidden>·</span>
            <span>{relativeTime}</span>
          </>
        )}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={article.image_url || categoryPlaceholderThumbnail(article.category)}
        alt=""
        className="w-full rounded-xl aspect-video object-cover bg-muted"
      />

      <p className="text-base leading-relaxed whitespace-pre-line">
        {article.translated_summary}
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          nativeButton={false}
          render={
            <Link href={article.original_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              元記事を読む({article.source?.name})
            </Link>
          }
        />
        <LikeDislikeButtons articleId={article.id} />
      </div>
    </article>
  );
}
