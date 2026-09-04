// scripts/ingest-local.ts (tsx実行、Next.jsビルドを介さない)からも使うため
// "server-only" は付けない(src/lib/ai/shared.ts参照)。
import Parser from "rss-parser";

export type FeedItem = {
  title: string;
  link: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  imageUrl?: string;
};

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; AINewsSiteBot/1.0)" },
});

/** RSS/Atomフィードを取得し、新着順の配列で返す。失敗時は空配列(呼び出し側でログ&スキップ)。 */
export async function fetchFeedItems(feedUrl: string, limit = 5): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    return (feed.items ?? []).slice(0, limit).map((item) => ({
      title: item.title ?? "(無題)",
      link: item.link ?? "",
      contentSnippet: item.contentSnippet,
      content: item.content,
      isoDate: item.isoDate,
      imageUrl: extractImageUrl(item),
    }));
  } catch (err) {
    console.error(`[fetchFeedItems] failed for ${feedUrl}:`, err);
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(item: any): string | undefined {
  if (item.enclosure?.url) return item.enclosure.url as string;
  const mediaContent = item["media:content"];
  if (mediaContent?.$?.url) return mediaContent.$.url as string;
  const mediaThumbnail = item["media:thumbnail"];
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url as string;
  return undefined;
}
