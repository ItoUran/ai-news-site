import { getArticlesByCategory } from "@/lib/articles";
import { ArticleGrid } from "@/components/article/article-grid";
import { Pagination } from "@/components/article/pagination";
import { CATEGORY_META } from "@/types/article";

export const revalidate = 300;

export default async function EntertainmentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { articles, totalPages } = await getArticlesByCategory("entertainment", page);
  const meta = CATEGORY_META.entertainment;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-bold border-b border-border pb-3">
        {meta.label}
      </h2>
      <ArticleGrid articles={articles} />
      <Pagination basePath="/entertainment" page={page} totalPages={totalPages} />
    </div>
  );
}
