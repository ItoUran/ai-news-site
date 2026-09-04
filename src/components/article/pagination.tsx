import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <nav className="flex items-center justify-center gap-3 pt-4" aria-label="ページ切り替え">
      <Button
        variant="outline"
        size="sm"
        disabled={!hasPrev}
        nativeButton={false}
        render={
          <Link
            href={hasPrev ? `${basePath}?page=${page - 1}` : "#"}
            aria-disabled={!hasPrev}
            className={cn(!hasPrev && "pointer-events-none opacity-50")}
          >
            <ChevronLeft className="size-4" />
            前へ
          </Link>
        }
      />
      <span className="text-sm text-muted-foreground tabular-nums">
        {page} / {totalPages} ページ
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        nativeButton={false}
        render={
          <Link
            href={hasNext ? `${basePath}?page=${page + 1}` : "#"}
            aria-disabled={!hasNext}
            className={cn(!hasNext && "pointer-events-none opacity-50")}
          >
            次へ
            <ChevronRight className="size-4" />
          </Link>
        }
      />
    </nav>
  );
}
