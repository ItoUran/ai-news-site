// scripts/ingest-local.ts (tsx実行、Next.jsビルドを介さない)からも使うため
// "server-only" は付けない(src/lib/ai/shared.ts参照)。
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchFeedItems } from "./fetchFeed";
import { extractArticleContent } from "./extractArticle";
import { hashUrl } from "./dedupe";
import type { ArticleCategory, Database } from "@/types/database";
import type { ArticleAnalysisInput, ArticleAnalysisResult } from "@/lib/ai/pipeline";

export type RunError = { source: string; message: string };

export type IngestionRunResult = {
  sourcesProcessed: number;
  articlesFetched: number;
  articlesPassed: number;
  articlesFailed: number;
  deepDivesGenerated: number;
  errors: RunError[];
};

export type AnalyzeArticleFn = (input: ArticleAnalysisInput) => Promise<ArticleAnalysisResult>;

/**
 * 挿入直後(fact_check_status = 'pass' のみ)に呼ばれる任意のフック。
 * ローカルOllama収集で「詳しく」ボタン用の解説を事前生成する用途に使う
 * (/api/cron/ingest 側のGemini収集では渡さない=無料枠温存のため未使用)。
 * 例外を投げても収集全体は止めない(呼び出し側のtry/catchに任せる)。
 */
export type OnArticleInsertedFn = (article: {
  id: string;
  title: string;
  translatedSummary: string;
  originalBody: string;
  category: ArticleCategory;
}) => Promise<void>;

/**
 * RSS収集 → 本文抽出 → AI分析(analyzeArticleFnとして注入) → DB保存、の共通ループ。
 * Vercel Cron向けの /api/cron/ingest と、ローカルLLM向けの scripts/ingest-local.ts の
 * 両方から呼び出す(AIプロバイダだけが異なる)。
 */
export async function runIngestion(
  supabase: SupabaseClient<Database>,
  analyzeArticleFn: AnalyzeArticleFn,
  options: {
    maxSourcesPerRun: number;
    maxArticlesPerRun: number;
    itemsPerSource?: number;
    onArticleInserted?: OnArticleInsertedFn;
  },
): Promise<IngestionRunResult> {
  const { maxSourcesPerRun, maxArticlesPerRun, itemsPerSource = 5, onArticleInserted } = options;
  const startedAt = new Date().toISOString();

  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("*")
    .eq("is_active", true)
    .limit(maxSourcesPerRun);

  if (sourcesError) {
    throw sourcesError;
  }

  let articlesFetched = 0;
  let articlesPassed = 0;
  let articlesFailed = 0;
  let deepDivesGenerated = 0;
  const errors: RunError[] = [];

  outer: for (const source of sources ?? []) {
    let items: Awaited<ReturnType<typeof fetchFeedItems>> = [];
    try {
      items = await fetchFeedItems(source.feed_url, itemsPerSource);
    } catch (err) {
      errors.push({ source: source.name, message: String(err) });
      continue;
    }

    for (const item of items) {
      if (articlesFetched >= maxArticlesPerRun) break outer;
      if (!item.link) continue;

      const urlHash = hashUrl(item.link);

      const { data: existing } = await supabase
        .from("articles")
        .select("id")
        .eq("url_hash", urlHash)
        .maybeSingle();

      if (existing) continue; // 既に処理済み(冪等性)

      articlesFetched++;

      try {
        const extracted = await extractArticleContent(item.link);
        const body = extracted.body ?? item.content ?? item.contentSnippet ?? "";
        // RSSフィード自体に画像が無いことが多いため、記事ページのog:image等で補完する
        const imageUrl = item.imageUrl ?? extracted.imageUrl ?? null;

        if (!body) {
          errors.push({ source: source.name, message: `本文取得失敗: ${item.link}` });
          articlesFailed++;
          continue;
        }

        const analysis = await analyzeArticleFn({
          sourceName: source.name,
          sourceUrl: item.link,
          sourceLanguage: source.language,
          sourceDefaultCategory: source.default_category as ArticleCategory,
          title: item.title,
          body,
          publishedAt: item.isoDate ?? null,
        });

        const truncatedBody = body.slice(0, 20000);
        const { data: inserted, error: insertError } = await supabase
          .from("articles")
          .insert({
            source_id: source.id,
            category: analysis.category,
            original_title: item.title,
            original_body: truncatedBody,
            original_url: item.link,
            url_hash: urlHash,
            original_language: source.language,
            translated_title: analysis.translatedTitle,
            translated_summary: analysis.translatedSummary,
            image_url: imageUrl,
            keywords: analysis.keywords,
            published_at: item.isoDate ?? null,
            fact_check_status: analysis.factCheckStatus,
            fact_check_score: analysis.factCheckScore,
            fact_check_notes: analysis.factCheckNotes,
          })
          .select("id")
          .single();

        if (insertError) {
          errors.push({ source: source.name, message: insertError.message });
          articlesFailed++;
        } else if (analysis.factCheckStatus === "pass") {
          articlesPassed++;

          if (onArticleInserted && inserted) {
            try {
              await onArticleInserted({
                id: inserted.id,
                title: analysis.translatedTitle,
                translatedSummary: analysis.translatedSummary,
                originalBody: truncatedBody,
                category: analysis.category,
              });
              deepDivesGenerated++;
            } catch (err) {
              // 事前生成に失敗しても収集自体は止めない(記事詳細ページ側の
              // オンデマンド生成にフォールバックできるため)
              errors.push({
                source: source.name,
                message: `詳細解説の事前生成に失敗: ${String(err)}`,
              });
            }
          }
        }
      } catch (err) {
        errors.push({ source: source.name, message: String(err) });
        articlesFailed++;
      }
    }
  }

  await supabase.from("ingestion_runs").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    sources_processed: sources?.length ?? 0,
    articles_fetched: articlesFetched,
    articles_passed: articlesPassed,
    articles_failed: articlesFailed,
    errors,
  });

  return {
    sourcesProcessed: sources?.length ?? 0,
    articlesFetched,
    articlesPassed,
    articlesFailed,
    deepDivesGenerated,
    errors,
  };
}
