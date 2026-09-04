// scripts/ingest-local.ts (tsx実行、Next.jsビルドを介さない)からも使うため
// "server-only" は付けない(src/lib/ai/shared.ts参照)。
import { createHash } from "node:crypto";

/** URLから重複排除用のハッシュキーを生成する */
export function hashUrl(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex");
}
