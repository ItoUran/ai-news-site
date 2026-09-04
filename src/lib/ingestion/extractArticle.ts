// scripts/ingest-local.ts (tsx実行、Next.jsビルドを介さない)からも使うため
// "server-only" は付けない(src/lib/ai/shared.ts参照)。
//
// DOM実装には jsdom ではなく linkedom を使用している。jsdomは実機検証の結果、
// Vercelのサーバーレス環境で依存関係(html-encoding-sniffer -> @exodus/bytes)の
// ESM/CommonJS相互運用エラーによりクラッシュすることを確認したため
// (serverExternalPackages指定でも解決せず)。linkedomは軽量でこの問題が無い。
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; AINewsSiteBot/1.0; +https://example.com/bot)";

export type ExtractedArticle = {
  body: string | null;
  imageUrl: string | null;
};

/**
 * 記事URLから本文(Readability方式)とサムネイル画像URL(og:image等)を抽出する。
 * RSSフィード自体に画像情報が無いことが多い(例: NHKニュース)ため、記事ページ本体の
 * メタタグから補完する。取得・抽出に失敗した場合は body: null を返す
 * (呼び出し側でRSSのsummary等にフォールバックする)。
 */
export async function extractArticleContent(url: string): Promise<ExtractedArticle> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return { body: null, imageUrl: null };
    const html = await res.text();

    const { document } = parseHTML(html);
    // 相対URL(og:image等)を正しく絶対URL解決させるためbase要素でURLを与える
    const base = document.createElement("base");
    base.setAttribute("href", url);
    document.head?.appendChild(base);

    const imageUrl = extractImageMeta(document, url);

    const reader = new Readability(document);
    const article = reader.parse();

    return {
      body: article?.textContent?.trim() || null,
      imageUrl,
    };
  } catch {
    return { body: null, imageUrl: null };
  }
}

/** og:image / twitter:image メタタグからサムネイル画像URLを取得する(相対URLは絶対URLに解決) */
function extractImageMeta(document: Document, pageUrl: string): string | null {
  const selectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
  ];
  for (const selector of selectors) {
    const content = document.querySelector(selector)?.getAttribute("content");
    if (content && content.trim()) {
      try {
        return new URL(content.trim(), pageUrl).toString();
      } catch {
        return content.trim();
      }
    }
  }
  return null;
}
