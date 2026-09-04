import { ArticleGridSkeleton } from "@/components/article/article-grid-skeleton";

export default function Loading() {
  return <ArticleGridSkeleton title="おすすめ" bordered={false} count={24} />;
}
