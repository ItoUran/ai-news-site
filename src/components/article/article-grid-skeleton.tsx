/**
 * タブ切り替え直後、記事データの取得が完了するまでの間に即座に表示するスケルトン。
 * Next.jsのSuspense(loading.tsx)から使う。実データが届くまでの「待たされている感」を
 * 減らすための表示専用コンポーネントで、データ取得や外部呼び出しは一切行わない。
 */
export function ArticleGridSkeleton({
  title,
  bordered = true,
  count = 9,
}: {
  title?: string;
  bordered?: boolean;
  count?: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      {title ? (
        <h2
          className={
            bordered
              ? "font-heading text-2xl font-bold border-b border-border pb-3"
              : "font-heading text-2xl font-bold"
          }
        >
          {title}
        </h2>
      ) : (
        <div className="h-8 w-40 rounded bg-muted animate-pulse" />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
          >
            <div className="aspect-video w-full bg-muted animate-pulse" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
