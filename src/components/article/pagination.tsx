import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Base UIのButtonラッパー(render={<Link/>})経由だと、有効/無効の切り替えで
  // サーバー/クライアントのclassName・tabIndexがズレてハイドレーション不一致警告が出るため、
  // ここでは buttonVariants を直接Linkに適用してBase UIの内部状態管理を回避している。
  return (
    <nav className="flex items-center justify-center gap-3 pt-4" aria-label="ページ切り替え">
      <Link
        href={hasPrev ? `${basePath}?page=${page - 1}` : "#"}
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? undefined : -1}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          !hasPrev && "pointer-events-none opacity-50",
        )}
      >
        <ChevronLeft className="size-4" />
        前へ
      </Link>
      <span className="text-sm text-muted-foreground tabular-nums">
        {page} / {totalPages} ページ
      </span>
      <Link
        href={hasNext ? `${basePath}?page=${page + 1}` : "#"}
        aria-disabled={!hasNext}
        tabIndex={hasNext ? undefined : -1}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          !hasNext && "pointer-events-none opacity-50",
        )}
      >
        次へ
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
