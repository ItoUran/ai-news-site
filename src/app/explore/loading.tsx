import { ArticleGridSkeleton } from "@/components/article/article-grid-skeleton";

export default function Loading() {
  return <ArticleGridSkeleton title="探索" bordered={false} count={24} />;
}
