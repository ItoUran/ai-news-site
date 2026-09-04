import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_META } from "@/types/article";
import type { ArticleWithSource } from "@/types/database";
import { LikeDislikeButtons } from "./like-dislike-buttons";

export function ArticleCard({
  article,
  showLikeDislike = false,
}: {
  article: ArticleWithSource;
  showLikeDislike?: boolean;
}) {
  const meta = CATEGORY_META[article.category];
  const relativeTime = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ja })
    : null;

  return (
    <div className="group/card flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 h-full">
      <Link href={`/article/${article.id}`} className="flex flex-col flex-1">
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            className="aspect-video w-full object-cover bg-muted"
            loading="lazy"
          />
        ) : (
          <div className="aspect-video w-full bg-muted" aria-hidden />
        )}

        <div className="flex flex-col flex-1 gap-2 p-4">
          <Badge className={meta.badgeClass}>{meta.label}</Badge>

          <h3 className="font-heading text-base font-bold leading-snug group-hover/card:text-primary transition-colors">
            {article.translated_title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
            {article.translated_summary}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <span className="font-medium">{article.source?.name ?? "不明なソース"}</span>
            {relativeTime && (
              <>
                <span aria-hidden>·</span>
                <span>{relativeTime}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {showLikeDislike && (
        <div className="px-4 pb-4">
          <LikeDislikeButtons articleId={article.id} />
        </div>
      )}
    </div>
  );
}
