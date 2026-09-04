import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h2 className="font-heading text-xl font-bold">ページが見つかりません</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Button nativeButton={false} render={<Link href="/explore">探索タブへ戻る</Link>} />
    </div>
  );
}
